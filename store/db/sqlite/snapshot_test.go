package sqlite

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/usememos/memos/internal/profile"
)

func TestCreateSnapshotCapturesCommittedWALState(t *testing.T) {
	ctx := context.Background()
	sourcePath := filepath.Join(t.TempDir(), "source.db")
	driver, err := NewDB(&profile.Profile{Driver: "sqlite", DSN: sourcePath})
	require.NoError(t, err)
	defer driver.Close()

	db := driver.GetDB()
	_, err = db.ExecContext(ctx, "CREATE TABLE snapshot_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL)")
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, "INSERT INTO snapshot_probe(value) VALUES (?)", "present")
	require.NoError(t, err)

	destination := filepath.Join(t.TempDir(), "snapshot.db")
	created, err := CreateSnapshot(ctx, db, destination)
	require.NoError(t, err)
	require.Equal(t, destination, created)
	require.FileExists(t, destination)

	snapshot, err := NewDB(&profile.Profile{Driver: "sqlite", DSN: destination})
	require.NoError(t, err)
	defer snapshot.Close()

	var value string
	require.NoError(t, snapshot.GetDB().QueryRowContext(ctx, "SELECT value FROM snapshot_probe WHERE id = 1").Scan(&value))
	require.Equal(t, "present", value)
}

func TestCreateSnapshotRefusesExistingDestination(t *testing.T) {
	ctx := context.Background()
	sourcePath := filepath.Join(t.TempDir(), "source.db")
	driver, err := NewDB(&profile.Profile{Driver: "sqlite", DSN: sourcePath})
	require.NoError(t, err)
	defer driver.Close()
	require.NoError(t, driver.GetDB().PingContext(ctx))

	destination := filepath.Join(t.TempDir(), "snapshot.db")
	require.NoError(t, os.WriteFile(destination, []byte("keep"), 0600))

	_, err = CreateSnapshot(ctx, driver.GetDB(), destination)
	require.ErrorContains(t, err, "already exists")
	require.Equal(t, []byte("keep"), mustReadFile(t, destination))
}

func TestCreateSnapshotRefusesSourcePath(t *testing.T) {
	ctx := context.Background()
	sourcePath := filepath.Join(t.TempDir(), "source.db")
	driver, err := NewDB(&profile.Profile{Driver: "sqlite", DSN: sourcePath})
	require.NoError(t, err)
	defer driver.Close()
	require.NoError(t, driver.GetDB().PingContext(ctx))

	_, err = CreateSnapshot(ctx, driver.GetDB(), sourcePath)
	require.ErrorContains(t, err, "destination already exists")
}

func mustReadFile(t *testing.T, path string) []byte {
	t.Helper()
	content, err := os.ReadFile(path)
	require.NoError(t, err)
	return content
}
