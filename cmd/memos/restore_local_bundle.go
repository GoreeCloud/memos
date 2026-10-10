package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
)

const restoredSQLiteDatabaseName = "memos_prod.db"

func runRestoreSQLiteLocalRecoveryBundle(ctx context.Context, bundleDir, targetDataDir string, out io.Writer) error {
	if strings.TrimSpace(bundleDir) == "" {
		return errors.New("--bundle is required")
	}
	if strings.TrimSpace(targetDataDir) == "" {
		return errors.New("--data is required")
	}

	absoluteBundle, err := filepath.Abs(bundleDir)
	if err != nil {
		return errors.Wrap(err, "resolve recovery bundle path")
	}
	absoluteTarget, err := filepath.Abs(targetDataDir)
	if err != nil {
		return errors.Wrap(err, "resolve restore target data directory")
	}
	if absoluteBundle == absoluteTarget {
		return errors.New("restore target data directory must differ from recovery bundle path")
	}
	if inside, err := pathWithinRoot(absoluteBundle, absoluteTarget); err != nil {
		return err
	} else if inside {
		return errors.New("restore target data directory must not be inside the recovery bundle")
	}

	if info, err := os.Lstat(absoluteTarget); err == nil {
		if info.IsDir() {
			return errors.Errorf("restore target data directory already exists: %s", absoluteTarget)
		}
		return errors.Errorf("restore target path already exists as a file: %s", absoluteTarget)
	} else if !os.IsNotExist(err) {
		return errors.Wrap(err, "inspect restore target data directory")
	}

	parent := filepath.Dir(absoluteTarget)
	parentInfo, err := os.Stat(parent)
	if err != nil {
		return errors.Wrap(err, "inspect restore target parent directory")
	}
	if !parentInfo.IsDir() {
		return errors.Errorf("restore target parent is not a directory: %s", parent)
	}

	if err := runVerifySQLiteLocalRecoveryBundle(ctx, absoluteBundle, io.Discard); err != nil {
		return errors.Wrap(err, "verify recovery bundle before restore")
	}

	var manifest sqliteLocalBundleManifest
	if err := decodeStrictJSONFile(filepath.Join(absoluteBundle, sqliteLocalBundleManifestName), &manifest); err != nil {
		return errors.Wrap(err, "read verified recovery bundle manifest")
	}

	tempDir, err := os.MkdirTemp(parent, "."+filepath.Base(absoluteTarget)+".restore-")
	if err != nil {
		return errors.Wrap(err, "create restore staging directory")
	}
	keepTemp := false
	defer func() {
		if !keepTemp {
			_ = os.RemoveAll(tempDir)
		}
	}()

	databaseSource := filepath.Join(absoluteBundle, sqliteLocalBundleDatabaseName)
	databaseTarget := filepath.Join(tempDir, restoredSQLiteDatabaseName)
	if err := copyRestoreArtifact(databaseSource, databaseTarget, manifest.Database.SizeBytes, manifest.Database.SHA256); err != nil {
		return errors.Wrap(err, "restore SQLite database artifact")
	}
	if err := verifySQLiteDatabaseQuickCheck(ctx, databaseTarget); err != nil {
		return errors.Wrap(err, "verify restored SQLite database")
	}

	copiedReferences := make(map[string]bool)
	for _, file := range manifest.LocalAttachments.Files {
		reference, err := validateRestoreReference(file.Reference)
		if err != nil {
			return errors.Wrapf(err, "attachment %s", file.AttachmentUID)
		}
		if copiedReferences[reference] {
			continue
		}

		source := filepath.Join(absoluteBundle, filepath.FromSlash(file.BundlePath))
		destination := filepath.Join(tempDir, filepath.FromSlash(reference))
		within, err := pathWithinRoot(tempDir, destination)
		if err != nil {
			return err
		}
		if !within {
			return errors.Errorf("restore destination escapes staged data directory: %q", reference)
		}
		if err := copyRestoreArtifact(source, destination, file.SizeBytes, file.SHA256); err != nil {
			return errors.Wrapf(err, "restore managed-local attachment %s", file.AttachmentUID)
		}
		copiedReferences[reference] = true
	}

	if _, err := os.Lstat(absoluteTarget); err == nil {
		return errors.Errorf("restore target appeared during staged restore: %s", absoluteTarget)
	} else if !os.IsNotExist(err) {
		return errors.Wrap(err, "recheck restore target before publish")
	}
	if err := os.Rename(tempDir, absoluteTarget); err != nil {
		return errors.Wrap(err, "publish restored data directory")
	}
	keepTemp = true

	printSQLiteLocalRestoreBoundary(out, absoluteTarget)
	return nil
}

func validateRestoreReference(reference string) (string, error) {
	portable := strings.ReplaceAll(reference, "\\", "/")
	normalized := path.Clean(portable)
	if normalized == "." || normalized == ".." || strings.HasPrefix(normalized, "../") || path.IsAbs(normalized) || looksLikeWindowsAbsolutePath(normalized) {
		return "", errors.Errorf("absolute or escaping managed-local restore reference is not supported: %q", reference)
	}
	if normalized != portable {
		return "", errors.Errorf("non-canonical managed-local restore reference is not supported: %q", reference)
	}
	return normalized, nil
}

func copyRestoreArtifact(sourcePath, destinationPath string, expectedSize int64, expectedSHA256 string) error {
	sourceInfo, err := os.Lstat(sourcePath)
	if err != nil {
		return errors.Wrap(err, "inspect recovery artifact")
	}
	if sourceInfo.Mode()&os.ModeSymlink != 0 || !sourceInfo.Mode().IsRegular() {
		return errors.Errorf("recovery artifact is not a regular non-symlink file: %s", sourcePath)
	}
	if sourceInfo.Size() != expectedSize {
		return errors.Errorf("recovery artifact size mismatch: expected %d, got %d", expectedSize, sourceInfo.Size())
	}

	if err := os.MkdirAll(filepath.Dir(destinationPath), 0o700); err != nil {
		return errors.Wrap(err, "create restore destination directory")
	}
	destination, err := os.OpenFile(destinationPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return errors.Wrap(err, "create restore artifact")
	}

	source, err := os.Open(sourcePath)
	if err != nil {
		_ = destination.Close()
		_ = os.Remove(destinationPath)
		return errors.Wrap(err, "open recovery artifact")
	}
	defer source.Close()

	hasher := sha256.New()
	written, copyErr := io.Copy(io.MultiWriter(destination, hasher), source)
	syncErr := destination.Sync()
	closeErr := destination.Close()
	if copyErr != nil {
		_ = os.Remove(destinationPath)
		return errors.Wrap(copyErr, "copy recovery artifact")
	}
	if syncErr != nil {
		_ = os.Remove(destinationPath)
		return errors.Wrap(syncErr, "sync restored artifact")
	}
	if closeErr != nil {
		_ = os.Remove(destinationPath)
		return errors.Wrap(closeErr, "close restored artifact")
	}
	if written != expectedSize {
		_ = os.Remove(destinationPath)
		return errors.Errorf("restored artifact size mismatch: expected %d, copied %d", expectedSize, written)
	}
	actualSHA256 := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(actualSHA256, expectedSHA256) {
		_ = os.Remove(destinationPath)
		return errors.Errorf("restored artifact SHA-256 mismatch: expected %s, got %s", expectedSHA256, actualSHA256)
	}
	return nil
}
