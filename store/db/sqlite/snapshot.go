package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
)

// CreateSnapshot writes a transactionally consistent SQLite database snapshot
// using VACUUM INTO and verifies the resulting database with PRAGMA quick_check.
//
// This snapshots database state only. It does not capture managed local files,
// S3 objects, deployment configuration, or secret material that may be required
// for complete GoreeCloud Memos instance recovery.
func CreateSnapshot(ctx context.Context, source *sql.DB, destination string) (string, error) {
	if source == nil {
		return "", errors.New("source database is required")
	}
	if strings.TrimSpace(destination) == "" {
		return "", errors.New("snapshot destination is required")
	}

	absoluteDestination, err := filepath.Abs(destination)
	if err != nil {
		return "", errors.Wrap(err, "resolve snapshot destination")
	}
	if info, err := os.Stat(absoluteDestination); err == nil {
		if info.IsDir() {
			return "", errors.Errorf("snapshot destination is a directory: %s", absoluteDestination)
		}
		return "", errors.Errorf("snapshot destination already exists: %s", absoluteDestination)
	} else if !os.IsNotExist(err) {
		return "", errors.Wrap(err, "inspect snapshot destination")
	}

	parent := filepath.Dir(absoluteDestination)
	info, err := os.Stat(parent)
	if err != nil {
		return "", errors.Wrap(err, "inspect snapshot destination directory")
	}
	if !info.IsDir() {
		return "", errors.Errorf("snapshot destination parent is not a directory: %s", parent)
	}

	sourcePath, err := primaryDatabasePath(ctx, source)
	if err != nil {
		return "", err
	}
	if sourcePath != "" {
		absoluteSource, err := filepath.Abs(sourcePath)
		if err != nil {
			return "", errors.Wrap(err, "resolve source database path")
		}
		if same, err := sameFilePath(absoluteSource, absoluteDestination); err != nil {
			return "", err
		} else if same {
			return "", errors.New("snapshot destination must differ from source database")
		}
	}

	if _, err := source.ExecContext(ctx, "VACUUM INTO ?", absoluteDestination); err != nil {
		_ = os.Remove(absoluteDestination)
		return "", errors.Wrap(err, "create SQLite snapshot")
	}

	if err := verifySnapshot(ctx, absoluteDestination); err != nil {
		_ = os.Remove(absoluteDestination)
		return "", err
	}
	return absoluteDestination, nil
}

func primaryDatabasePath(ctx context.Context, source *sql.DB) (string, error) {
	rows, err := source.QueryContext(ctx, "PRAGMA database_list")
	if err != nil {
		return "", errors.Wrap(err, "read SQLite database list")
	}
	defer rows.Close()

	for rows.Next() {
		var sequence int
		var name, path string
		if err := rows.Scan(&sequence, &name, &path); err != nil {
			return "", errors.Wrap(err, "scan SQLite database list")
		}
		if name == "main" {
			return path, nil
		}
	}
	if err := rows.Err(); err != nil {
		return "", errors.Wrap(err, "iterate SQLite database list")
	}
	return "", errors.New("SQLite main database path not found")
}

func sameFilePath(a, b string) (bool, error) {
	a = filepath.Clean(a)
	b = filepath.Clean(b)
	if a == b {
		return true, nil
	}
	aInfo, aErr := os.Stat(a)
	bInfo, bErr := os.Stat(b)
	if aErr == nil && bErr == nil {
		return os.SameFile(aInfo, bInfo), nil
	}
	if aErr != nil && !os.IsNotExist(aErr) {
		return false, errors.Wrap(aErr, "inspect source database path")
	}
	if bErr != nil && !os.IsNotExist(bErr) {
		return false, errors.Wrap(bErr, "inspect snapshot destination path")
	}
	return false, nil
}

func verifySnapshot(ctx context.Context, destination string) error {
	snapshot, err := sql.Open("sqlite", destination+"?_pragma=query_only(1)")
	if err != nil {
		return errors.Wrap(err, "open SQLite snapshot for verification")
	}
	defer snapshot.Close()

	var result string
	if err := snapshot.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&result); err != nil {
		return errors.Wrap(err, "verify SQLite snapshot")
	}
	if result != "ok" {
		return fmt.Errorf("SQLite snapshot integrity check failed: %s", result)
	}
	return nil
}
