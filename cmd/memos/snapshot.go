package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/internal/version"
	"github.com/usememos/memos/store/db"
	sqlitedb "github.com/usememos/memos/store/db/sqlite"
)

func newSnapshotCommand() *cobra.Command {
	snapshotCmd := &cobra.Command{
		Use:   "snapshot",
		Short: "Create bounded recovery snapshots",
	}

	var dataDir, dsn, output string
	sqliteCmd := &cobra.Command{
		Use:   "sqlite",
		Short: "Create an integrity-checked SQLite database snapshot",
		Long: "Create a transactionally consistent SQLite database snapshot. " +
			"This is a database-only recovery primitive, not a complete GoreeCloud Memos instance backup.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runSQLiteSnapshot(cmd.Context(), dataDir, dsn, output, cmd.OutOrStdout())
		},
	}
	sqliteCmd.Flags().StringVar(&dataDir, "data", "", "Memos data directory containing the default SQLite database")
	sqliteCmd.Flags().StringVar(&dsn, "dsn", "", "explicit SQLite database path; overrides the default path derived from --data")
	sqliteCmd.Flags().StringVarP(&output, "output", "o", "", "new snapshot file path (must not already exist)")
	if err := sqliteCmd.MarkFlagRequired("output"); err != nil {
		panic(err)
	}

	var localDataDir, localDSN, localOutput string
	localBundleCmd := &cobra.Command{
		Use:   "sqlite-local",
		Short: "Create a SQLite + relative managed-local attachment recovery bundle",
		Long: "Create a bounded recovery bundle containing a transactionally consistent SQLite snapshot and every relative LOCAL attachment file referenced by that exact snapshot. " +
			"Bundle creation fails closed on missing, mismatched, absolute, non-canonical, or data-directory-escaping LOCAL references. S3 objects, deployment configuration, and reusable secrets remain separate recovery requirements.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runSQLiteLocalRecoveryBundle(cmd.Context(), localDataDir, localDSN, localOutput, cmd.OutOrStdout())
		},
	}
	localBundleCmd.Flags().StringVar(&localDataDir, "data", "", "Memos data directory used to resolve relative LOCAL attachment references")
	localBundleCmd.Flags().StringVar(&localDSN, "dsn", "", "explicit SQLite database path; overrides the default path derived from --data")
	localBundleCmd.Flags().StringVarP(&localOutput, "output", "o", "", "new recovery bundle directory (must not already exist)")
	if err := localBundleCmd.MarkFlagRequired("data"); err != nil {
		panic(err)
	}
	if err := localBundleCmd.MarkFlagRequired("output"); err != nil {
		panic(err)
	}

	snapshotCmd.AddCommand(sqliteCmd, localBundleCmd)
	return snapshotCmd
}

func runSQLiteSnapshot(ctx context.Context, dataDir, dsn, output string, out io.Writer) error {
	if dataDir == "" && dsn == "" {
		return errors.New("either --data or --dsn is required so the source database is explicit")
	}

	if err := ensureSnapshotManifestDestinationAvailable(output); err != nil {
		return err
	}

	instanceProfile := &profile.Profile{
		Data:   dataDir,
		Driver: "sqlite",
		DSN:    dsn,
	}
	if err := instanceProfile.Validate(); err != nil {
		return errors.Wrap(err, "validate SQLite snapshot source")
	}

	driver, err := db.NewDBDriver(instanceProfile)
	if err != nil {
		return errors.Wrap(err, "open SQLite snapshot source")
	}
	defer driver.Close()

	created, err := sqlitedb.CreateSnapshot(ctx, driver.GetDB(), output)
	if err != nil {
		return err
	}

	manifestPath, err := writeSQLiteSnapshotManifest(created, version.GetCurrentVersion(), version.Commit, time.Now())
	if err != nil {
		_ = os.Remove(created)
		return errors.Wrap(err, "create SQLite snapshot manifest")
	}

	fmt.Fprintf(out, "SQLite database snapshot created: %s\n", created)
	fmt.Fprintf(out, "Snapshot manifest created: %s\n", manifestPath)
	fmt.Fprintln(out, "This snapshot contains database state only. Preserve required local/S3 attachment bytes, deployment configuration, and secret material separately for full-instance recovery.")
	return nil
}
