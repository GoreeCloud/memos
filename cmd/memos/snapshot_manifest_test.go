package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestWriteSQLiteSnapshotManifest(t *testing.T) {
	dir := t.TempDir()
	snapshot := filepath.Join(dir, "snapshot.db")
	content := []byte("bounded-snapshot-bytes")
	require.NoError(t, os.WriteFile(snapshot, content, 0o600))

	createdAt := time.Date(2026, 10, 8, 19, 45, 0, 123, time.UTC)
	manifestPath, err := writeSQLiteSnapshotManifest(snapshot, "0.31.0-goreecloud-dev", "abc123", createdAt)
	require.NoError(t, err)
	require.Equal(t, snapshot+".manifest.json", manifestPath)
	if runtime.GOOS != "windows" {
		info, err := os.Stat(manifestPath)
		require.NoError(t, err)
		require.Equal(t, os.FileMode(0o600), info.Mode().Perm())
	}

	var manifest sqliteSnapshotManifest
	payload, err := os.ReadFile(manifestPath)
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(payload, &manifest))

	sum := sha256.Sum256(content)
	require.Equal(t, sqliteSnapshotManifestSchemaVersion, manifest.SchemaVersion)
	require.Equal(t, "goreecloud-memos-sqlite-database-snapshot", manifest.ArtifactType)
	require.Equal(t, createdAt.Format(time.RFC3339Nano), manifest.CreatedAt)
	require.Equal(t, sqliteSnapshotApplication{Version: "0.31.0-goreecloud-dev", Commit: "abc123"}, manifest.Application)
	require.Equal(t, filepath.Base(snapshot), manifest.Snapshot.FileName)
	require.EqualValues(t, len(content), manifest.Snapshot.SizeBytes)
	require.Equal(t, hex.EncodeToString(sum[:]), manifest.Snapshot.SHA256)
	require.Equal(t, "ok", manifest.Integrity.SQLiteQuickCheck)
	require.Equal(t, "included", manifest.Scope["database"].State)
	require.Equal(t, "included", manifest.Scope["databaseBackedAttachments"].State)
	for _, key := range []string{"managedLocalAttachments", "s3Attachments", "deploymentConfiguration", "secretMaterial"} {
		require.Equal(t, "excluded", manifest.Scope[key].State, key)
	}
}

func TestRunSQLiteSnapshotCreatesArtifactPair(t *testing.T) {
	dataDir := t.TempDir()
	output := filepath.Join(t.TempDir(), "snapshot.db")
	var stdout strings.Builder

	err := runSQLiteSnapshot(t.Context(), dataDir, "", output, &stdout)
	require.NoError(t, err)
	require.FileExists(t, output)
	require.FileExists(t, snapshotManifestPath(output))
	require.Contains(t, stdout.String(), "SQLite database snapshot created:")
	require.Contains(t, stdout.String(), "Snapshot manifest created:")
	require.Contains(t, stdout.String(), "database state only")

	var manifest sqliteSnapshotManifest
	payload, err := os.ReadFile(snapshotManifestPath(output))
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(payload, &manifest))
	require.Equal(t, "dev", manifest.Application.Version)
	require.Equal(t, "unknown", manifest.Application.Commit)
	require.Equal(t, filepath.Base(output), manifest.Snapshot.FileName)
	require.Positive(t, manifest.Snapshot.SizeBytes)
	require.Len(t, manifest.Snapshot.SHA256, 64)
}

func TestRunSQLiteSnapshotRefusesManifestCollisionBeforeSnapshot(t *testing.T) {
	dataDir := t.TempDir()
	output := filepath.Join(t.TempDir(), "snapshot.db")
	manifestPath := snapshotManifestPath(output)
	require.NoError(t, os.WriteFile(manifestPath, []byte("keep"), 0o600))

	err := runSQLiteSnapshot(t.Context(), dataDir, "", output, &strings.Builder{})
	require.ErrorContains(t, err, "manifest destination already exists")
	require.NoFileExists(t, output)
	require.Equal(t, []byte("keep"), mustReadSnapshotManifestFile(t, manifestPath))
}

func TestEnsureSnapshotManifestDestinationAvailableRefusesExistingFile(t *testing.T) {
	snapshot := filepath.Join(t.TempDir(), "snapshot.db")
	manifest := snapshotManifestPath(snapshot)
	require.NoError(t, os.WriteFile(manifest, []byte("keep"), 0o600))

	err := ensureSnapshotManifestDestinationAvailable(snapshot)
	require.ErrorContains(t, err, "already exists")
	require.Equal(t, []byte("keep"), mustReadSnapshotManifestFile(t, manifest))
}

func mustReadSnapshotManifestFile(t *testing.T, path string) []byte {
	t.Helper()
	content, err := os.ReadFile(path)
	require.NoError(t, err)
	return content
}
