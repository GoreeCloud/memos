package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/internal/version"
	"github.com/usememos/memos/store/db"
	sqlitedb "github.com/usememos/memos/store/db/sqlite"
)

const (
	sqliteLocalBundleSchemaVersion = 1
	sqliteLocalBundleDatabaseName  = "memos.db"
	sqliteLocalBundleFilesDir      = "local-files"
	sqliteLocalBundleManifestName  = "bundle-manifest.json"
)

type sqliteLocalBundleManifest struct {
	SchemaVersion    int                                `json:"schemaVersion"`
	ArtifactType     string                             `json:"artifactType"`
	CreatedAt        string                             `json:"createdAt"`
	Application      sqliteSnapshotApplication          `json:"application"`
	Database         sqliteSnapshotArtifact             `json:"database"`
	LocalAttachments sqliteLocalBundleAttachmentSummary `json:"localAttachments"`
	Scope            map[string]sqliteSnapshotScope     `json:"scope"`
}

type sqliteLocalBundleAttachmentSummary struct {
	Count           int                               `json:"count"`
	UniqueFileCount int                               `json:"uniqueFileCount"`
	ReferencedBytes int64                             `json:"referencedBytes"`
	StoredBytes     int64                             `json:"storedBytes"`
	Files           []sqliteLocalBundleAttachmentFile `json:"files"`
}

type sqliteLocalBundleAttachmentFile struct {
	AttachmentUID string `json:"attachmentUid"`
	Filename      string `json:"filename"`
	Reference     string `json:"reference"`
	BundlePath    string `json:"bundlePath"`
	SizeBytes     int64  `json:"sizeBytes"`
	SHA256        string `json:"sha256"`
}

type sqliteLocalAttachmentRecord struct {
	UID       string
	Filename  string
	SizeBytes int64
	Reference string
}

type copiedLocalAttachment struct {
	BundlePath string
	SizeBytes  int64
	SHA256     string
}

func runSQLiteLocalRecoveryBundle(ctx context.Context, dataDir, dsn, output string, out io.Writer) error {
	if strings.TrimSpace(dataDir) == "" {
		return errors.New("--data is required because relative LOCAL attachment references are resolved from the instance data directory")
	}
	if strings.TrimSpace(output) == "" {
		return errors.New("--output is required")
	}

	absoluteOutput, err := filepath.Abs(output)
	if err != nil {
		return errors.Wrap(err, "resolve recovery bundle destination")
	}
	if err := ensureDirectoryDestinationAvailable(absoluteOutput); err != nil {
		return err
	}

	parent := filepath.Dir(absoluteOutput)
	parentInfo, err := os.Stat(parent)
	if err != nil {
		return errors.Wrap(err, "inspect recovery bundle destination directory")
	}
	if !parentInfo.IsDir() {
		return errors.Errorf("recovery bundle destination parent is not a directory: %s", parent)
	}

	instanceProfile := &profile.Profile{
		Data:   dataDir,
		Driver: "sqlite",
		DSN:    dsn,
	}
	if err := instanceProfile.Validate(); err != nil {
		return errors.Wrap(err, "validate SQLite recovery bundle source")
	}

	driver, err := db.NewDBDriver(instanceProfile)
	if err != nil {
		return errors.Wrap(err, "open SQLite recovery bundle source")
	}
	defer driver.Close()

	tempDir, err := os.MkdirTemp(parent, "."+filepath.Base(absoluteOutput)+".tmp-")
	if err != nil {
		return errors.Wrap(err, "create recovery bundle staging directory")
	}
	keepTemp := false
	defer func() {
		if !keepTemp {
			_ = os.RemoveAll(tempDir)
		}
	}()

	databasePath := filepath.Join(tempDir, sqliteLocalBundleDatabaseName)
	createdDatabase, err := sqlitedb.CreateSnapshot(ctx, driver.GetDB(), databasePath)
	if err != nil {
		return err
	}
	databaseManifestPath, err := writeSQLiteSnapshotManifest(createdDatabase, version.GetCurrentVersion(), version.Commit, time.Now())
	if err != nil {
		return errors.Wrap(err, "create bundled SQLite snapshot manifest")
	}

	localFilesRoot := filepath.Join(tempDir, sqliteLocalBundleFilesDir)
	if err := os.Mkdir(localFilesRoot, 0o700); err != nil {
		return errors.Wrap(err, "create managed-local attachment bundle directory")
	}
	localFiles, err := captureSQLiteLocalAttachments(ctx, createdDatabase, dataDir, localFilesRoot)
	if err != nil {
		return err
	}

	databaseArtifact, err := readSnapshotArtifact(databaseManifestPath)
	if err != nil {
		return err
	}
	if err := writeSQLiteLocalBundleManifest(
		filepath.Join(tempDir, sqliteLocalBundleManifestName),
		databaseArtifact,
		localFiles,
		version.GetCurrentVersion(),
		version.Commit,
		time.Now(),
	); err != nil {
		return err
	}

	if err := os.Rename(tempDir, absoluteOutput); err != nil {
		return errors.Wrap(err, "publish recovery bundle")
	}
	keepTemp = true

	fmt.Fprintf(out, "SQLite + managed-local recovery bundle created: %s\n", absoluteOutput)
	fmt.Fprintf(out, "Bundled managed-local attachments: %d\n", len(localFiles))
	fmt.Fprintln(out, "This bounded bundle includes the SQLite database and relative managed-local attachment files only. S3 objects, deployment configuration, absolute LOCAL references, and reusable secret material remain separate recovery requirements.")
	return nil
}

func ensureDirectoryDestinationAvailable(destination string) error {
	info, err := os.Stat(destination)
	if err == nil {
		if info.IsDir() {
			return errors.Errorf("recovery bundle destination directory already exists: %s", destination)
		}
		return errors.Errorf("recovery bundle destination already exists as a file: %s", destination)
	}
	if !os.IsNotExist(err) {
		return errors.Wrap(err, "inspect recovery bundle destination")
	}
	return nil
}

func captureSQLiteLocalAttachments(ctx context.Context, snapshotPath, dataDir, bundleRoot string) ([]sqliteLocalBundleAttachmentFile, error) {
	records, err := listSQLiteLocalAttachments(ctx, snapshotPath)
	if err != nil {
		return nil, err
	}

	absoluteDataDir, err := filepath.Abs(dataDir)
	if err != nil {
		return nil, errors.Wrap(err, "resolve instance data directory")
	}
	realDataDir, err := filepath.EvalSymlinks(absoluteDataDir)
	if err != nil {
		return nil, errors.Wrap(err, "resolve instance data directory symlinks")
	}

	copied := make(map[string]copiedLocalAttachment)
	files := make([]sqliteLocalBundleAttachmentFile, 0, len(records))
	for _, record := range records {
		normalizedReference, sourcePath, err := resolveBundledLocalReference(realDataDir, record.Reference)
		if err != nil {
			return nil, errors.Wrapf(err, "attachment %s", record.UID)
		}
		bundleRelativePath := path.Join(sqliteLocalBundleFilesDir, normalizedReference)
		copiedFile, ok := copied[normalizedReference]
		if !ok {
			destinationPath := filepath.Join(bundleRoot, filepath.FromSlash(normalizedReference))
			copiedFile, err = copyVerifiedLocalAttachment(sourcePath, destinationPath, record.SizeBytes)
			if err != nil {
				return nil, errors.Wrapf(err, "attachment %s", record.UID)
			}
			copiedFile.BundlePath = bundleRelativePath
			copied[normalizedReference] = copiedFile
		} else if copiedFile.SizeBytes != record.SizeBytes {
			return nil, errors.Errorf(
				"attachment %s shares local reference %q but records size %d instead of %d",
				record.UID,
				record.Reference,
				record.SizeBytes,
				copiedFile.SizeBytes,
			)
		}

		files = append(files, sqliteLocalBundleAttachmentFile{
			AttachmentUID: record.UID,
			Filename:      record.Filename,
			Reference:     normalizedReference,
			BundlePath:    copiedFile.BundlePath,
			SizeBytes:     copiedFile.SizeBytes,
			SHA256:        copiedFile.SHA256,
		})
	}
	return files, nil
}

func listSQLiteLocalAttachments(ctx context.Context, snapshotPath string) ([]sqliteLocalAttachmentRecord, error) {
	snapshot, err := sql.Open("sqlite", snapshotPath+"?_pragma=query_only(1)")
	if err != nil {
		return nil, errors.Wrap(err, "open SQLite snapshot for local attachment inventory")
	}
	defer snapshot.Close()

	rows, err := snapshot.QueryContext(ctx, `
		SELECT uid, filename, size, reference
		FROM attachment
		WHERE storage_type = 'LOCAL'
		ORDER BY uid
	`)
	if err != nil {
		return nil, errors.Wrap(err, "query SQLite snapshot local attachments")
	}
	defer rows.Close()

	records := []sqliteLocalAttachmentRecord{}
	for rows.Next() {
		var record sqliteLocalAttachmentRecord
		if err := rows.Scan(&record.UID, &record.Filename, &record.SizeBytes, &record.Reference); err != nil {
			return nil, errors.Wrap(err, "scan SQLite snapshot local attachment")
		}
		if strings.TrimSpace(record.UID) == "" {
			return nil, errors.New("SQLite snapshot contains a LOCAL attachment with an empty UID")
		}
		if record.SizeBytes < 0 {
			return nil, errors.Errorf("SQLite snapshot attachment %s has negative size %d", record.UID, record.SizeBytes)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Wrap(err, "iterate SQLite snapshot local attachments")
	}
	return records, nil
}

func resolveBundledLocalReference(dataDir, reference string) (string, string, error) {
	if reference == "" {
		return "", "", errors.New("LOCAL attachment reference is empty")
	}

	normalized := path.Clean(strings.ReplaceAll(reference, "\\", "/"))
	if normalized == "." || normalized == ".." || strings.HasPrefix(normalized, "../") || path.IsAbs(normalized) || looksLikeWindowsAbsolutePath(normalized) {
		return "", "", errors.Errorf("absolute or escaping LOCAL attachment reference is not supported by this bounded bundle: %q", reference)
	}
	if normalized != strings.ReplaceAll(reference, "\\", "/") {
		return "", "", errors.Errorf("non-canonical LOCAL attachment reference is not supported: %q", reference)
	}

	sourcePath := filepath.Join(dataDir, filepath.FromSlash(normalized))
	resolvedSource, err := filepath.EvalSymlinks(sourcePath)
	if err != nil {
		return "", "", errors.Wrap(err, "resolve managed-local attachment file")
	}
	within, err := pathWithinRoot(dataDir, resolvedSource)
	if err != nil {
		return "", "", err
	}
	if !within {
		return "", "", errors.Errorf("LOCAL attachment reference escapes the instance data directory: %q", reference)
	}
	return normalized, resolvedSource, nil
}

func looksLikeWindowsAbsolutePath(value string) bool {
	return len(value) >= 3 &&
		((value[0] >= 'A' && value[0] <= 'Z') || (value[0] >= 'a' && value[0] <= 'z')) &&
		value[1] == ':' &&
		value[2] == '/'
}

func pathWithinRoot(root, candidate string) (bool, error) {
	relative, err := filepath.Rel(root, candidate)
	if err != nil {
		return false, errors.Wrap(err, "compare managed-local attachment path with data directory")
	}
	return relative != ".." && !strings.HasPrefix(relative, ".."+string(os.PathSeparator)) && !filepath.IsAbs(relative), nil
}

func copyVerifiedLocalAttachment(sourcePath, destinationPath string, expectedSize int64) (copiedLocalAttachment, error) {
	sourceInfo, err := os.Stat(sourcePath)
	if err != nil {
		return copiedLocalAttachment{}, errors.Wrap(err, "inspect managed-local attachment file")
	}
	if !sourceInfo.Mode().IsRegular() {
		return copiedLocalAttachment{}, errors.Errorf("managed-local attachment is not a regular file: %s", sourcePath)
	}
	if sourceInfo.Size() != expectedSize {
		return copiedLocalAttachment{}, errors.Errorf(
			"managed-local attachment size mismatch: database=%d file=%d",
			expectedSize,
			sourceInfo.Size(),
		)
	}

	if err := os.MkdirAll(filepath.Dir(destinationPath), 0o700); err != nil {
		return copiedLocalAttachment{}, errors.Wrap(err, "create managed-local attachment destination directory")
	}
	destination, err := os.OpenFile(destinationPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return copiedLocalAttachment{}, errors.Wrap(err, "create managed-local attachment bundle file")
	}

	source, err := os.Open(sourcePath)
	if err != nil {
		_ = destination.Close()
		_ = os.Remove(destinationPath)
		return copiedLocalAttachment{}, errors.Wrap(err, "open managed-local attachment file")
	}
	defer source.Close()

	hasher := sha256.New()
	size, copyErr := io.Copy(io.MultiWriter(destination, hasher), source)
	syncErr := destination.Sync()
	closeErr := destination.Close()
	if copyErr != nil {
		_ = os.Remove(destinationPath)
		return copiedLocalAttachment{}, errors.Wrap(copyErr, "copy managed-local attachment file")
	}
	if syncErr != nil {
		_ = os.Remove(destinationPath)
		return copiedLocalAttachment{}, errors.Wrap(syncErr, "sync managed-local attachment bundle file")
	}
	if closeErr != nil {
		_ = os.Remove(destinationPath)
		return copiedLocalAttachment{}, errors.Wrap(closeErr, "close managed-local attachment bundle file")
	}
	if size != expectedSize {
		_ = os.Remove(destinationPath)
		return copiedLocalAttachment{}, errors.Errorf("managed-local attachment changed during copy: expected %d bytes, copied %d", expectedSize, size)
	}

	return copiedLocalAttachment{
		SizeBytes: size,
		SHA256:    hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}

func readSnapshotArtifact(manifestPath string) (sqliteSnapshotArtifact, error) {
	payload, err := os.ReadFile(manifestPath)
	if err != nil {
		return sqliteSnapshotArtifact{}, errors.Wrap(err, "read bundled SQLite snapshot manifest")
	}
	var manifest sqliteSnapshotManifest
	if err := json.Unmarshal(payload, &manifest); err != nil {
		return sqliteSnapshotArtifact{}, errors.Wrap(err, "decode bundled SQLite snapshot manifest")
	}
	return manifest.Snapshot, nil
}

func writeSQLiteLocalBundleManifest(
	manifestPath string,
	database sqliteSnapshotArtifact,
	files []sqliteLocalBundleAttachmentFile,
	appVersion,
	appCommit string,
	now time.Time,
) error {
	var referencedBytes, storedBytes int64
	uniqueFiles := make(map[string]bool, len(files))
	for _, file := range files {
		referencedBytes += file.SizeBytes
		if !uniqueFiles[file.BundlePath] {
			uniqueFiles[file.BundlePath] = true
			storedBytes += file.SizeBytes
		}
	}

	manifest := sqliteLocalBundleManifest{
		SchemaVersion: sqliteLocalBundleSchemaVersion,
		ArtifactType:  "goreecloud-memos-sqlite-local-recovery-bundle",
		CreatedAt:     now.UTC().Format(time.RFC3339Nano),
		Application: sqliteSnapshotApplication{
			Version: appVersion,
			Commit:  appCommit,
		},
		Database: database,
		LocalAttachments: sqliteLocalBundleAttachmentSummary{
			Count:           len(files),
			UniqueFileCount: len(uniqueFiles),
			ReferencedBytes: referencedBytes,
			StoredBytes:     storedBytes,
			Files:           files,
		},
		Scope: map[string]sqliteSnapshotScope{
			"database": {
				State:  "included",
				Reason: "transactionally consistent SQLite snapshot",
			},
			"databaseBackedAttachments": {
				State:  "included",
				Reason: "attachment bytes stored in database rows are part of the SQLite artifact",
			},
			"managedLocalAttachments": {
				State:  "included-bounded",
				Reason: "all relative LOCAL attachment references in the exact snapshot were copied, size-checked, and SHA-256 inventoried",
			},
			"absoluteLocalAttachments": {
				State:  "unsupported",
				Reason: "bundle creation fails closed if the snapshot contains an absolute LOCAL attachment reference",
			},
			"s3Attachments": {
				State:  "excluded",
				Reason: "S3 object bytes and storage configuration require separate preservation",
			},
			"deploymentConfiguration": {
				State:  "excluded",
				Reason: "deployment/runtime configuration can exist outside the database",
			},
			"secretMaterial": {
				State:  "excluded",
				Reason: "reusable secrets remain under their governing secret-management authority",
			},
		},
	}

	payload, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return errors.Wrap(err, "encode SQLite + local recovery bundle manifest")
	}
	payload = append(payload, '\n')

	out, err := os.OpenFile(manifestPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return errors.Wrap(err, "create SQLite + local recovery bundle manifest")
	}
	writeErr := func() error {
		if _, err := out.Write(payload); err != nil {
			return errors.Wrap(err, "write SQLite + local recovery bundle manifest")
		}
		if err := out.Sync(); err != nil {
			return errors.Wrap(err, "sync SQLite + local recovery bundle manifest")
		}
		return out.Close()
	}()
	if writeErr != nil {
		_ = out.Close()
		_ = os.Remove(manifestPath)
		return writeErr
	}
	return nil
}
