package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
)

func runVerifySQLiteLocalRecoveryBundle(ctx context.Context, bundleDir string, out io.Writer) error {
	if strings.TrimSpace(bundleDir) == "" {
		return errors.New("--bundle is required")
	}

	absoluteBundle, err := filepath.Abs(bundleDir)
	if err != nil {
		return errors.Wrap(err, "resolve recovery bundle path")
	}
	rootInfo, err := os.Lstat(absoluteBundle)
	if err != nil {
		return errors.Wrap(err, "inspect recovery bundle path")
	}
	if rootInfo.Mode()&os.ModeSymlink != 0 || !rootInfo.IsDir() {
		return errors.Errorf("recovery bundle path must be a real directory: %s", absoluteBundle)
	}

	var manifest sqliteLocalBundleManifest
	if err := decodeStrictJSONFile(filepath.Join(absoluteBundle, sqliteLocalBundleManifestName), &manifest); err != nil {
		return errors.Wrap(err, "read recovery bundle manifest")
	}
	if err := validateSQLiteLocalBundleManifest(manifest); err != nil {
		return err
	}

	databasePath := filepath.Join(absoluteBundle, sqliteLocalBundleDatabaseName)
	if err := verifyBundleRegularFile(absoluteBundle, sqliteLocalBundleDatabaseName, manifest.Database.SizeBytes, manifest.Database.SHA256); err != nil {
		return errors.Wrap(err, "verify bundled SQLite database artifact")
	}
	if err := verifyBundledSQLiteManifest(absoluteBundle, manifest); err != nil {
		return err
	}
	if err := verifySQLiteDatabaseQuickCheck(ctx, databasePath); err != nil {
		return err
	}

	records, err := listSQLiteLocalAttachments(ctx, databasePath)
	if err != nil {
		return errors.Wrap(err, "read bundled SQLite attachment inventory")
	}
	if err := verifySQLiteLocalAttachmentManifest(absoluteBundle, manifest.LocalAttachments, records); err != nil {
		return err
	}

	fmt.Fprintf(out, "SQLite + managed-local recovery bundle verified: %s\n", absoluteBundle)
	fmt.Fprintf(out, "Verified managed-local attachment rows: %d\n", manifest.LocalAttachments.Count)
	fmt.Fprintln(out, "Verification covers this bounded bundle only. S3 objects, absolute LOCAL references, deployment configuration, reusable secrets, scheduling, retention, and full restore orchestration remain separate recovery requirements.")
	return nil
}

func decodeStrictJSONFile(filePath string, target any) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return errors.Wrap(err, "decode JSON")
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return errors.New("JSON file contains trailing data")
		}
		return errors.Wrap(err, "decode trailing JSON")
	}
	return nil
}

func validateSQLiteLocalBundleManifest(manifest sqliteLocalBundleManifest) error {
	if manifest.SchemaVersion != sqliteLocalBundleSchemaVersion {
		return errors.Errorf("unsupported recovery bundle schema version: %d", manifest.SchemaVersion)
	}
	if manifest.ArtifactType != "goreecloud-memos-sqlite-local-recovery-bundle" {
		return errors.Errorf("unexpected recovery bundle artifact type: %q", manifest.ArtifactType)
	}
	if manifest.Database.FileName != sqliteLocalBundleDatabaseName {
		return errors.Errorf("unexpected bundled database filename: %q", manifest.Database.FileName)
	}
	if manifest.Database.SizeBytes < 0 {
		return errors.Errorf("bundled database has negative size: %d", manifest.Database.SizeBytes)
	}
	if err := validateSHA256Hex(manifest.Database.SHA256); err != nil {
		return errors.Wrap(err, "bundled database SHA-256")
	}

	requiredScope := map[string]string{
		"database":                  "included",
		"databaseBackedAttachments": "included",
		"managedLocalAttachments":   "included-bounded",
		"absoluteLocalAttachments":  "unsupported",
		"s3Attachments":             "excluded",
		"deploymentConfiguration":   "excluded",
		"secretMaterial":            "excluded",
	}
	for key, state := range requiredScope {
		entry, ok := manifest.Scope[key]
		if !ok {
			return errors.Errorf("recovery bundle scope is missing %q", key)
		}
		if entry.State != state {
			return errors.Errorf("recovery bundle scope %q has state %q instead of %q", key, entry.State, state)
		}
	}
	return nil
}

func verifyBundledSQLiteManifest(bundleRoot string, bundleManifest sqliteLocalBundleManifest) error {
	manifestPath := filepath.Join(bundleRoot, sqliteLocalBundleDatabaseName+".manifest.json")
	var databaseManifest sqliteSnapshotManifest
	if err := decodeStrictJSONFile(manifestPath, &databaseManifest); err != nil {
		return errors.Wrap(err, "read bundled SQLite snapshot manifest")
	}
	if databaseManifest.SchemaVersion != sqliteSnapshotManifestSchemaVersion {
		return errors.Errorf("unsupported bundled SQLite snapshot manifest schema version: %d", databaseManifest.SchemaVersion)
	}
	if databaseManifest.ArtifactType != "goreecloud-memos-sqlite-database-snapshot" {
		return errors.Errorf("unexpected bundled SQLite snapshot artifact type: %q", databaseManifest.ArtifactType)
	}
	if databaseManifest.Snapshot != bundleManifest.Database {
		return errors.New("bundle manifest database identity does not match SQLite snapshot manifest")
	}
	if databaseManifest.Application != bundleManifest.Application {
		return errors.New("bundle manifest application identity does not match SQLite snapshot manifest")
	}
	if databaseManifest.Integrity.SQLiteQuickCheck != "ok" {
		return errors.Errorf("bundled SQLite snapshot manifest does not record a successful quick-check: %q", databaseManifest.Integrity.SQLiteQuickCheck)
	}
	return nil
}

func verifySQLiteDatabaseQuickCheck(ctx context.Context, databasePath string) error {
	database, err := sql.Open("sqlite", databasePath+"?_pragma=query_only(1)")
	if err != nil {
		return errors.Wrap(err, "open bundled SQLite database for integrity verification")
	}
	defer database.Close()

	var result string
	if err := database.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&result); err != nil {
		return errors.Wrap(err, "run bundled SQLite quick-check")
	}
	if result != "ok" {
		return errors.Errorf("bundled SQLite quick-check failed: %s", result)
	}
	return nil
}

func verifySQLiteLocalAttachmentManifest(bundleRoot string, summary sqliteLocalBundleAttachmentSummary, records []sqliteLocalAttachmentRecord) error {
	if summary.Count != len(summary.Files) {
		return errors.Errorf("recovery bundle attachment count mismatch: manifest=%d entries=%d", summary.Count, len(summary.Files))
	}
	if summary.Count != len(records) {
		return errors.Errorf("recovery bundle attachment count does not match SQLite snapshot: manifest=%d database=%d", summary.Count, len(records))
	}

	recordByUID := make(map[string]sqliteLocalAttachmentRecord, len(records))
	for _, record := range records {
		if _, exists := recordByUID[record.UID]; exists {
			return errors.Errorf("SQLite snapshot contains duplicate LOCAL attachment UID %q", record.UID)
		}
		recordByUID[record.UID] = record
	}

	manifestByUID := make(map[string]sqliteLocalBundleAttachmentFile, len(summary.Files))
	expectedPaths := make(map[string]bool)
	var referencedBytes, storedBytes int64
	for _, entry := range summary.Files {
		if strings.TrimSpace(entry.AttachmentUID) == "" {
			return errors.New("recovery bundle attachment entry has an empty UID")
		}
		if _, exists := manifestByUID[entry.AttachmentUID]; exists {
			return errors.Errorf("recovery bundle contains duplicate attachment UID %q", entry.AttachmentUID)
		}
		record, ok := recordByUID[entry.AttachmentUID]
		if !ok {
			return errors.Errorf("recovery bundle attachment %q is not present in the SQLite snapshot", entry.AttachmentUID)
		}
		if entry.Filename != record.Filename || entry.SizeBytes != record.SizeBytes || entry.Reference != record.Reference {
			return errors.Errorf("recovery bundle attachment %q does not match the SQLite snapshot row", entry.AttachmentUID)
		}
		if entry.SizeBytes < 0 {
			return errors.Errorf("recovery bundle attachment %q has negative size %d", entry.AttachmentUID, entry.SizeBytes)
		}
		if err := validateSHA256Hex(entry.SHA256); err != nil {
			return errors.Wrapf(err, "recovery bundle attachment %q SHA-256", entry.AttachmentUID)
		}

		normalizedReference, err := validatePortableBundlePath(entry.Reference)
		if err != nil {
			return errors.Wrapf(err, "recovery bundle attachment %q reference", entry.AttachmentUID)
		}
		expectedBundlePath := path.Join(sqliteLocalBundleFilesDir, normalizedReference)
		if entry.BundlePath != expectedBundlePath {
			return errors.Errorf("recovery bundle attachment %q path mismatch: got %q expected %q", entry.AttachmentUID, entry.BundlePath, expectedBundlePath)
		}
		if err := verifyBundleRegularFile(bundleRoot, entry.BundlePath, entry.SizeBytes, entry.SHA256); err != nil {
			return errors.Wrapf(err, "verify recovery bundle attachment %q", entry.AttachmentUID)
		}

		referencedBytes += entry.SizeBytes
		if !expectedPaths[entry.BundlePath] {
			expectedPaths[entry.BundlePath] = true
			storedBytes += entry.SizeBytes
		}
		manifestByUID[entry.AttachmentUID] = entry
	}

	if len(manifestByUID) != len(recordByUID) {
		return errors.New("recovery bundle attachment manifest does not cover every SQLite LOCAL attachment row")
	}
	if summary.UniqueFileCount != len(expectedPaths) {
		return errors.Errorf("recovery bundle unique file count mismatch: manifest=%d verified=%d", summary.UniqueFileCount, len(expectedPaths))
	}
	if summary.ReferencedBytes != referencedBytes {
		return errors.Errorf("recovery bundle referenced byte count mismatch: manifest=%d verified=%d", summary.ReferencedBytes, referencedBytes)
	}
	if summary.StoredBytes != storedBytes {
		return errors.Errorf("recovery bundle stored byte count mismatch: manifest=%d verified=%d", summary.StoredBytes, storedBytes)
	}
	if err := rejectUnexpectedBundleFiles(bundleRoot, expectedPaths); err != nil {
		return err
	}
	return nil
}

func validatePortableBundlePath(value string) (string, error) {
	if value == "" {
		return "", errors.New("path is empty")
	}
	normalized := path.Clean(strings.ReplaceAll(value, "\\", "/"))
	if normalized == "." || normalized == ".." || strings.HasPrefix(normalized, "../") || path.IsAbs(normalized) || looksLikeWindowsAbsolutePath(normalized) {
		return "", errors.Errorf("path is absolute or escapes the bundle: %q", value)
	}
	if normalized != strings.ReplaceAll(value, "\\", "/") {
		return "", errors.Errorf("path is not canonical: %q", value)
	}
	return normalized, nil
}

func verifyBundleRegularFile(bundleRoot, relativePath string, expectedSize int64, expectedSHA string) error {
	normalized, err := validatePortableBundlePath(relativePath)
	if err != nil {
		return err
	}
	absolutePath := filepath.Join(bundleRoot, filepath.FromSlash(normalized))
	if err := rejectSymlinkComponents(bundleRoot, filepath.FromSlash(normalized)); err != nil {
		return err
	}
	info, err := os.Stat(absolutePath)
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() {
		return errors.Errorf("bundle path is not a regular file: %s", relativePath)
	}
	if info.Size() != expectedSize {
		return errors.Errorf("file size mismatch for %s: manifest=%d actual=%d", relativePath, expectedSize, info.Size())
	}
	digest, err := sha256File(absolutePath)
	if err != nil {
		return err
	}
	if digest != strings.ToLower(expectedSHA) {
		return errors.Errorf("SHA-256 mismatch for %s", relativePath)
	}
	return nil
}

func rejectSymlinkComponents(bundleRoot, relativePath string) error {
	current := bundleRoot
	for _, component := range strings.Split(filepath.Clean(relativePath), string(os.PathSeparator)) {
		if component == "." || component == "" {
			continue
		}
		current = filepath.Join(current, component)
		info, err := os.Lstat(current)
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return errors.Errorf("bundle path contains a symbolic link: %s", relativePath)
		}
	}
	return nil
}

func rejectUnexpectedBundleFiles(bundleRoot string, expected map[string]bool) error {
	localRoot := filepath.Join(bundleRoot, sqliteLocalBundleFilesDir)
	return filepath.WalkDir(localRoot, func(filePath string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.Type()&os.ModeSymlink != 0 {
			return errors.Errorf("recovery bundle contains symbolic link: %s", filePath)
		}
		if entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return errors.Errorf("recovery bundle contains non-regular file: %s", filePath)
		}
		relative, err := filepath.Rel(bundleRoot, filePath)
		if err != nil {
			return err
		}
		portable := filepath.ToSlash(relative)
		if !expected[portable] {
			return errors.Errorf("recovery bundle contains unexpected file: %s", portable)
		}
		return nil
	})
}

func validateSHA256Hex(value string) error {
	if len(value) != sha256.Size*2 {
		return errors.Errorf("expected %d hexadecimal characters", sha256.Size*2)
	}
	if _, err := hex.DecodeString(value); err != nil {
		return errors.Wrap(err, "invalid hexadecimal digest")
	}
	return nil
}

func sha256File(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}
