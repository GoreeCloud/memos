package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRunSQLiteLocalRecoveryBundleCapturesRelativeManagedFiles(t *testing.T) {
	dataDir := t.TempDir()
	firstContent := []byte("first managed attachment")
	secondContent := []byte("second managed attachment")
	require.NoError(t, os.MkdirAll(filepath.Join(dataDir, "assets", "nested"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(dataDir, "assets", "first.txt"), firstContent, 0o600))
	require.NoError(t, os.WriteFile(filepath.Join(dataDir, "assets", "nested", "second.bin"), secondContent, 0o600))

	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "attach-a", Filename: "first.txt", SizeBytes: int64(len(firstContent)), Reference: "assets/first.txt"},
		{UID: "attach-b", Filename: "second.bin", SizeBytes: int64(len(secondContent)), Reference: "assets/nested/second.bin"},
	})

	output := filepath.Join(t.TempDir(), "recovery-bundle")
	var stdout strings.Builder
	require.NoError(t, runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &stdout))

	require.FileExists(t, filepath.Join(output, sqliteLocalBundleDatabaseName))
	require.FileExists(t, filepath.Join(output, sqliteLocalBundleDatabaseName+".manifest.json"))
	require.FileExists(t, filepath.Join(output, sqliteLocalBundleManifestName))
	require.Equal(t, firstContent, mustReadLocalBundleFile(t, filepath.Join(output, "local-files", "assets", "first.txt")))
	require.Equal(t, secondContent, mustReadLocalBundleFile(t, filepath.Join(output, "local-files", "assets", "nested", "second.bin")))
	require.Contains(t, stdout.String(), "SQLite + managed-local recovery bundle created:")
	require.Contains(t, stdout.String(), "Bundled managed-local attachments: 2")
	require.Contains(t, stdout.String(), "S3 objects")

	var manifest sqliteLocalBundleManifest
	require.NoError(t, json.Unmarshal(mustReadLocalBundleFile(t, filepath.Join(output, sqliteLocalBundleManifestName)), &manifest))
	require.Equal(t, sqliteLocalBundleSchemaVersion, manifest.SchemaVersion)
	require.Equal(t, "goreecloud-memos-sqlite-local-recovery-bundle", manifest.ArtifactType)
	require.Equal(t, 2, manifest.LocalAttachments.Count)
	require.Equal(t, 2, manifest.LocalAttachments.UniqueFileCount)
	require.Equal(t, int64(len(firstContent)+len(secondContent)), manifest.LocalAttachments.ReferencedBytes)
	require.Equal(t, int64(len(firstContent)+len(secondContent)), manifest.LocalAttachments.StoredBytes)
	require.Len(t, manifest.LocalAttachments.Files, 2)
	require.Equal(t, "included-bounded", manifest.Scope["managedLocalAttachments"].State)
	require.Equal(t, "unsupported", manifest.Scope["absoluteLocalAttachments"].State)
	require.Equal(t, "excluded", manifest.Scope["s3Attachments"].State)

	firstHash := sha256.Sum256(firstContent)
	require.Equal(t, "attach-a", manifest.LocalAttachments.Files[0].AttachmentUID)
	require.Equal(t, "assets/first.txt", manifest.LocalAttachments.Files[0].Reference)
	require.Equal(t, "local-files/assets/first.txt", manifest.LocalAttachments.Files[0].BundlePath)
	require.Equal(t, hex.EncodeToString(firstHash[:]), manifest.LocalAttachments.Files[0].SHA256)
	require.NotContains(t, string(mustReadLocalBundleFile(t, filepath.Join(output, sqliteLocalBundleManifestName))), dataDir)

	if runtime.GOOS != "windows" {
		info, err := os.Stat(filepath.Join(output, sqliteLocalBundleManifestName))
		require.NoError(t, err)
		require.Equal(t, os.FileMode(0o600), info.Mode().Perm())
		fileInfo, err := os.Stat(filepath.Join(output, "local-files", "assets", "first.txt"))
		require.NoError(t, err)
		require.Equal(t, os.FileMode(0o600), fileInfo.Mode().Perm())
	}
}

func TestRunSQLiteLocalRecoveryBundleSupportsDuplicateRelativeReference(t *testing.T) {
	dataDir := t.TempDir()
	content := []byte("shared attachment bytes")
	require.NoError(t, os.MkdirAll(filepath.Join(dataDir, "assets"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(dataDir, "assets", "shared.txt"), content, 0o600))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "attach-a", Filename: "first-name.txt", SizeBytes: int64(len(content)), Reference: "assets/shared.txt"},
		{UID: "attach-b", Filename: "second-name.txt", SizeBytes: int64(len(content)), Reference: "assets/shared.txt"},
	})

	output := filepath.Join(t.TempDir(), "recovery-bundle")
	require.NoError(t, runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{}))

	var manifest sqliteLocalBundleManifest
	require.NoError(t, json.Unmarshal(mustReadLocalBundleFile(t, filepath.Join(output, sqliteLocalBundleManifestName)), &manifest))
	require.Equal(t, 2, manifest.LocalAttachments.Count)
	require.Equal(t, 1, manifest.LocalAttachments.UniqueFileCount)
	require.Equal(t, int64(len(content))*2, manifest.LocalAttachments.ReferencedBytes)
	require.Equal(t, int64(len(content)), manifest.LocalAttachments.StoredBytes)
	require.Equal(t, manifest.LocalAttachments.Files[0].SHA256, manifest.LocalAttachments.Files[1].SHA256)
	require.Equal(t, manifest.LocalAttachments.Files[0].BundlePath, manifest.LocalAttachments.Files[1].BundlePath)
}

func TestRunSQLiteLocalRecoveryBundleFailsClosedOnMissingFile(t *testing.T) {
	dataDir := t.TempDir()
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "missing-attachment", Filename: "missing.txt", SizeBytes: 5, Reference: "assets/missing.txt"},
	})
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "resolve managed-local attachment file")
	require.NoDirExists(t, output)
}

func TestRunSQLiteLocalRecoveryBundleFailsClosedOnSizeMismatch(t *testing.T) {
	dataDir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dataDir, "assets"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(dataDir, "assets", "changed.txt"), []byte("different"), 0o600))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "changed-attachment", Filename: "changed.txt", SizeBytes: 3, Reference: "assets/changed.txt"},
	})
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "size mismatch")
	require.NoDirExists(t, output)
}

func TestRunSQLiteLocalRecoveryBundleRejectsAbsoluteReference(t *testing.T) {
	dataDir := t.TempDir()
	absoluteFile := filepath.Join(t.TempDir(), "outside.txt")
	require.NoError(t, os.WriteFile(absoluteFile, []byte("outside"), 0o600))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "absolute-attachment", Filename: "outside.txt", SizeBytes: 7, Reference: filepath.ToSlash(absoluteFile)},
	})
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "absolute or escaping LOCAL attachment reference")
	require.NoDirExists(t, output)
}

func TestRunSQLiteLocalRecoveryBundleRejectsWindowsDriveAbsoluteReference(t *testing.T) {
	dataDir := t.TempDir()
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "windows-absolute-attachment", Filename: "outside.txt", SizeBytes: 7, Reference: "C:/memos/outside.txt"},
	})
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "absolute or escaping LOCAL attachment reference")
	require.NoDirExists(t, output)
}

func TestRunSQLiteLocalRecoveryBundleRejectsTraversalReference(t *testing.T) {
	parent := t.TempDir()
	dataDir := filepath.Join(parent, "data")
	require.NoError(t, os.Mkdir(dataDir, 0o700))
	outside := filepath.Join(parent, "outside.txt")
	require.NoError(t, os.WriteFile(outside, []byte("outside"), 0o600))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "escape-attachment", Filename: "outside.txt", SizeBytes: 7, Reference: "../outside.txt"},
	})
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "absolute or escaping LOCAL attachment reference")
	require.NoDirExists(t, output)
}

func TestRunSQLiteLocalRecoveryBundleRejectsSymlinkEscape(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink permissions vary on Windows")
	}
	parent := t.TempDir()
	dataDir := filepath.Join(parent, "data")
	require.NoError(t, os.Mkdir(dataDir, 0o700))
	outsideDir := filepath.Join(parent, "outside")
	require.NoError(t, os.Mkdir(outsideDir, 0o700))
	content := []byte("outside")
	require.NoError(t, os.WriteFile(filepath.Join(outsideDir, "attachment.txt"), content, 0o600))
	require.NoError(t, os.Symlink(outsideDir, filepath.Join(dataDir, "assets")))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{
		{UID: "symlink-attachment", Filename: "attachment.txt", SizeBytes: int64(len(content)), Reference: "assets/attachment.txt"},
	})
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "escapes the instance data directory")
	require.NoDirExists(t, output)
}

func TestRunSQLiteLocalRecoveryBundleAllowsNoLocalAttachments(t *testing.T) {
	dataDir := t.TempDir()
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, nil)
	output := filepath.Join(t.TempDir(), "recovery-bundle")

	require.NoError(t, runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{}))

	var manifest sqliteLocalBundleManifest
	require.NoError(t, json.Unmarshal(mustReadLocalBundleFile(t, filepath.Join(output, sqliteLocalBundleManifestName)), &manifest))
	require.Zero(t, manifest.LocalAttachments.Count)
	require.Zero(t, manifest.LocalAttachments.UniqueFileCount)
	require.Zero(t, manifest.LocalAttachments.ReferencedBytes)
	require.Zero(t, manifest.LocalAttachments.StoredBytes)
	require.Empty(t, manifest.LocalAttachments.Files)
	require.DirExists(t, filepath.Join(output, sqliteLocalBundleFilesDir))
}

func TestRunSQLiteLocalRecoveryBundleRefusesExistingDestination(t *testing.T) {
	dataDir := t.TempDir()
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, nil)
	output := filepath.Join(t.TempDir(), "recovery-bundle")
	require.NoError(t, os.Mkdir(output, 0o700))
	sentinel := filepath.Join(output, "keep.txt")
	require.NoError(t, os.WriteFile(sentinel, []byte("keep"), 0o600))

	err := runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, output, &strings.Builder{})
	require.ErrorContains(t, err, "destination directory already exists")
	require.Equal(t, []byte("keep"), mustReadLocalBundleFile(t, sentinel))
}

func createLocalBundleSourceDatabase(t *testing.T, dataDir string, records []sqliteLocalAttachmentRecord) string {
	t.Helper()
	sourcePath := filepath.Join(dataDir, "source.db")
	database, err := sql.Open("sqlite", sourcePath)
	require.NoError(t, err)

	_, err = database.Exec(
		"CREATE TABLE attachment (" +
			"uid TEXT NOT NULL UNIQUE," +
			"filename TEXT NOT NULL DEFAULT ''," +
			"size INTEGER NOT NULL DEFAULT 0," +
			"storage_type TEXT NOT NULL DEFAULT ''," +
			"reference TEXT NOT NULL DEFAULT ''" +
			")",
	)
	require.NoError(t, err)
	for _, record := range records {
		_, err := database.Exec(
			"INSERT INTO attachment(uid, filename, size, storage_type, reference) VALUES (?, ?, ?, 'LOCAL', ?)",
			record.UID,
			record.Filename,
			record.SizeBytes,
			record.Reference,
		)
		require.NoError(t, err)
	}
	require.NoError(t, database.Close())
	return sourcePath
}

func mustReadLocalBundleFile(t *testing.T, filePath string) []byte {
	t.Helper()
	content, err := os.ReadFile(filePath)
	require.NoError(t, err)
	return content
}
