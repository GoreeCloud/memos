package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/pkg/errors"
)

const sqliteSnapshotManifestSchemaVersion = 1

type sqliteSnapshotManifest struct {
	SchemaVersion int                            `json:"schemaVersion"`
	ArtifactType  string                         `json:"artifactType"`
	CreatedAt     string                         `json:"createdAt"`
	Application   sqliteSnapshotApplication      `json:"application"`
	Snapshot      sqliteSnapshotArtifact         `json:"snapshot"`
	Integrity     sqliteSnapshotIntegrity        `json:"integrity"`
	Scope         map[string]sqliteSnapshotScope `json:"scope"`
}

type sqliteSnapshotApplication struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
}

type sqliteSnapshotArtifact struct {
	FileName  string `json:"fileName"`
	SizeBytes int64  `json:"sizeBytes"`
	SHA256    string `json:"sha256"`
}

type sqliteSnapshotIntegrity struct {
	SQLiteQuickCheck string `json:"sqliteQuickCheck"`
}

type sqliteSnapshotScope struct {
	State  string `json:"state"`
	Reason string `json:"reason,omitempty"`
}

func snapshotManifestPath(snapshotPath string) string {
	return snapshotPath + ".manifest.json"
}

func ensureSnapshotManifestDestinationAvailable(snapshotPath string) error {
	path := snapshotManifestPath(snapshotPath)
	if info, err := os.Stat(path); err == nil {
		if info.IsDir() {
			return errors.Errorf("snapshot manifest destination is a directory: %s", path)
		}
		return errors.Errorf("snapshot manifest destination already exists: %s", path)
	} else if !os.IsNotExist(err) {
		return errors.Wrap(err, "inspect snapshot manifest destination")
	}
	return nil
}

func writeSQLiteSnapshotManifest(snapshotPath, appVersion, appCommit string, now time.Time) (string, error) {
	file, err := os.Open(snapshotPath)
	if err != nil {
		return "", errors.Wrap(err, "open SQLite snapshot for manifest")
	}
	hasher := sha256.New()
	size, err := io.Copy(hasher, file)
	closeErr := file.Close()
	if err != nil {
		return "", errors.Wrap(err, "hash SQLite snapshot")
	}
	if closeErr != nil {
		return "", errors.Wrap(closeErr, "close SQLite snapshot after manifest hash")
	}

	manifest := sqliteSnapshotManifest{
		SchemaVersion: sqliteSnapshotManifestSchemaVersion,
		ArtifactType:  "goreecloud-memos-sqlite-database-snapshot",
		CreatedAt:     now.UTC().Format(time.RFC3339Nano),
		Application: sqliteSnapshotApplication{
			Version: appVersion,
			Commit:  appCommit,
		},
		Snapshot: sqliteSnapshotArtifact{
			FileName:  filepath.Base(snapshotPath),
			SizeBytes: size,
			SHA256:    hex.EncodeToString(hasher.Sum(nil)),
		},
		Integrity: sqliteSnapshotIntegrity{SQLiteQuickCheck: "ok"},
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
				State:  "excluded",
				Reason: "local attachment files require separate inventory and preservation",
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
		return "", errors.Wrap(err, "encode SQLite snapshot manifest")
	}
	payload = append(payload, '\n')

	manifestPath := snapshotManifestPath(snapshotPath)
	out, err := os.OpenFile(manifestPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", errors.Wrap(err, "create SQLite snapshot manifest")
	}
	writeErr := func() error {
		if _, err := out.Write(payload); err != nil {
			return errors.Wrap(err, "write SQLite snapshot manifest")
		}
		if err := out.Sync(); err != nil {
			return errors.Wrap(err, "sync SQLite snapshot manifest")
		}
		return out.Close()
	}()
	if writeErr != nil {
		_ = out.Close()
		_ = os.Remove(manifestPath)
		return "", writeErr
	}
	return manifestPath, nil
}
