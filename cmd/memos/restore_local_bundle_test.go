package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRunRestoreSQLiteLocalRecoveryBundlePublishesCleanTarget(t *testing.T) {
	bundle, reference, content := createSQLiteLocalVerificationFixture(t)
	target := filepath.Join(t.TempDir(), "restored-data")

	var output strings.Builder
	require.NoError(t, runRestoreSQLiteLocalRecoveryBundle(t.Context(), bundle, target, &output))

	databasePath := filepath.Join(target, restoredSQLiteDatabaseName)
	require.FileExists(t, databasePath)
	require.Equal(t, content, mustReadLocalBundleFile(t, filepath.Join(target, filepath.FromSlash(reference))))
	require.Contains(t, output.String(), "restored to new data directory")
	require.Contains(t, output.String(), "S3 objects")

	database, err := sql.Open("sqlite", databasePath)
	require.NoError(t, err)
	defer database.Close()
	var restoredReference string
	require.NoError(t, database.QueryRow("SELECT reference FROM attachment WHERE uid = ?", "verify-attachment").Scan(&restoredReference))
	require.Equal(t, reference, restoredReference)

	if runtime.GOOS != "windows" {
		info, err := os.Stat(databasePath)
		require.NoError(t, err)
		require.Equal(t, os.FileMode(0o600), info.Mode().Perm())
		attachmentInfo, err := os.Stat(filepath.Join(target, filepath.FromSlash(reference)))
		require.NoError(t, err)
		require.Equal(t, os.FileMode(0o600), attachmentInfo.Mode().Perm())
	}
}

func TestRunRestoreSQLiteLocalRecoveryBundleRefusesExistingTarget(t *testing.T) {
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)
	target := filepath.Join(t.TempDir(), "restored-data")
	require.NoError(t, os.Mkdir(target, 0o700))
	sentinel := filepath.Join(target, "keep.txt")
	require.NoError(t, os.WriteFile(sentinel, []byte("keep"), 0o600))

	err := runRestoreSQLiteLocalRecoveryBundle(t.Context(), bundle, target, &strings.Builder{})
	require.ErrorContains(t, err, "already exists")
	require.Equal(t, []byte("keep"), mustReadLocalBundleFile(t, sentinel))
}

func TestRunRestoreSQLiteLocalRecoveryBundleRejectsTamperedBundleBeforePublishing(t *testing.T) {
	bundle, reference, original := createSQLiteLocalVerificationFixture(t)
	tampered := append([]byte(nil), original...)
	tampered[0] ^= 0x01
	require.NoError(t, os.WriteFile(filepath.Join(bundle, sqliteLocalBundleFilesDir, filepath.FromSlash(reference)), tampered, 0o600))

	target := filepath.Join(t.TempDir(), "restored-data")
	err := runRestoreSQLiteLocalRecoveryBundle(t.Context(), bundle, target, &strings.Builder{})
	require.ErrorContains(t, err, "verify recovery bundle before restore")
	require.NoDirExists(t, target)
}

func TestRunRestoreSQLiteLocalRecoveryBundleRejectsTargetInsideBundle(t *testing.T) {
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)
	target := filepath.Join(bundle, "restored-data")

	err := runRestoreSQLiteLocalRecoveryBundle(t.Context(), bundle, target, &strings.Builder{})
	require.ErrorContains(t, err, "must not be inside the recovery bundle")
	require.NoDirExists(t, target)
}
