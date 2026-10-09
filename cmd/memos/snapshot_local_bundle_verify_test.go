package main

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestVerifySQLiteLocalRecoveryBundleAcceptsUntamperedBundle(t *testing.T) {
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)

	var output strings.Builder
	require.NoError(t, runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &output))
	require.Contains(t, output.String(), "recovery bundle verified")
	require.Contains(t, output.String(), "Verified managed-local attachment rows: 1")
}

func TestVerifySQLiteLocalRecoveryBundleAcceptsNormalizedBackslashReference(t *testing.T) {
	dataDir := t.TempDir()
	databaseReference := `assets\verification.txt`
	portableReference := "assets/verification.txt"
	content := []byte("managed attachment verification bytes")
	require.NoError(t, os.MkdirAll(filepath.Join(dataDir, "assets"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(dataDir, filepath.FromSlash(portableReference)), content, 0o600))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{{
		UID:       "verify-backslash-attachment",
		Filename:  "verification.txt",
		SizeBytes: int64(len(content)),
		Reference: databaseReference,
	}})
	bundle := filepath.Join(t.TempDir(), "recovery-bundle")
	require.NoError(t, runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, bundle, &strings.Builder{}))

	require.NoError(t, runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{}))
}

func TestVerifySQLiteLocalRecoveryBundleRejectsTamperedAttachment(t *testing.T) {
	bundle, reference, original := createSQLiteLocalVerificationFixture(t)
	tampered := append([]byte(nil), original...)
	tampered[0] ^= 0x01
	require.NoError(t, os.WriteFile(filepath.Join(bundle, sqliteLocalBundleFilesDir, filepath.FromSlash(reference)), tampered, 0o600))

	err := runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{})
	require.ErrorContains(t, err, "SHA-256 mismatch")
}

func TestVerifySQLiteLocalRecoveryBundleRejectsUnexpectedFile(t *testing.T) {
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)
	extra := filepath.Join(bundle, sqliteLocalBundleFilesDir, "assets", "unexpected.txt")
	require.NoError(t, os.WriteFile(extra, []byte("unexpected"), 0o600))

	err := runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{})
	require.ErrorContains(t, err, "unexpected file")
}

func TestVerifySQLiteLocalRecoveryBundleRejectsTamperedDatabase(t *testing.T) {
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)
	databasePath := filepath.Join(bundle, sqliteLocalBundleDatabaseName)
	file, err := os.OpenFile(databasePath, os.O_APPEND|os.O_WRONLY, 0)
	require.NoError(t, err)
	_, err = file.Write([]byte{0x00})
	require.NoError(t, err)
	require.NoError(t, file.Close())

	err = runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{})
	require.ErrorContains(t, err, "file size mismatch")
}

func TestVerifySQLiteLocalRecoveryBundleRejectsUnknownManifestFields(t *testing.T) {
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)
	manifestPath := filepath.Join(bundle, sqliteLocalBundleManifestName)
	payload := mustReadLocalBundleFile(t, manifestPath)
	trimmed := strings.TrimSpace(string(payload))
	require.True(t, strings.HasSuffix(trimmed, "}"))
	tampered := strings.TrimSuffix(trimmed, "}") + ",\n  \"unexpected\": true\n}\n"
	require.NoError(t, os.WriteFile(manifestPath, []byte(tampered), 0o600))

	err := runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{})
	require.ErrorContains(t, err, "unknown field")
}

func TestVerifySQLiteLocalRecoveryBundleRejectsSymlinkedAttachment(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink permissions vary on Windows")
	}
	bundle, reference, original := createSQLiteLocalVerificationFixture(t)
	filePath := filepath.Join(bundle, sqliteLocalBundleFilesDir, filepath.FromSlash(reference))
	target := filepath.Join(bundle, sqliteLocalBundleFilesDir, "assets", "replacement.txt")
	require.NoError(t, os.WriteFile(target, original, 0o600))
	require.NoError(t, os.Remove(filePath))
	require.NoError(t, os.Symlink(target, filePath))

	err := runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{})
	require.ErrorContains(t, err, "symbolic link")
}

func TestVerifySQLiteLocalRecoveryBundleRejectsSymlinkedManifest(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink permissions vary on Windows")
	}
	bundle, _, _ := createSQLiteLocalVerificationFixture(t)
	manifestPath := filepath.Join(bundle, sqliteLocalBundleManifestName)
	payload := mustReadLocalBundleFile(t, manifestPath)
	target := filepath.Join(t.TempDir(), "bundle-manifest.json")
	require.NoError(t, os.WriteFile(target, payload, 0o600))
	require.NoError(t, os.Remove(manifestPath))
	require.NoError(t, os.Symlink(target, manifestPath))

	err := runVerifySQLiteLocalRecoveryBundle(t.Context(), bundle, &strings.Builder{})
	require.ErrorContains(t, err, "symbolic link")
}

func createSQLiteLocalVerificationFixture(t *testing.T) (string, string, []byte) {
	t.Helper()
	dataDir := t.TempDir()
	reference := "assets/verification.txt"
	content := []byte("managed attachment verification bytes")
	require.NoError(t, os.MkdirAll(filepath.Join(dataDir, "assets"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(dataDir, filepath.FromSlash(reference)), content, 0o600))
	sourcePath := createLocalBundleSourceDatabase(t, dataDir, []sqliteLocalAttachmentRecord{{
		UID:       "verify-attachment",
		Filename:  "verification.txt",
		SizeBytes: int64(len(content)),
		Reference: reference,
	}})
	bundle := filepath.Join(t.TempDir(), "recovery-bundle")
	require.NoError(t, runSQLiteLocalRecoveryBundle(t.Context(), dataDir, sourcePath, bundle, &strings.Builder{}))
	return bundle, reference, content
}
