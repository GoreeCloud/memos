package main

import (
	"context"
	"fmt"
	"io"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	"github.com/usememos/memos/internal/profile"
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

	snapshotCmd.AddCommand(sqliteCmd)
	return snapshotCmd
}

func runSQLiteSnapshot(ctx context.Context, dataDir, dsn, output string, out io.Writer) error {
	if dataDir == "" && dsn == "" {
		return errors.New("either --data or --dsn is required so the source database is explicit")
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

	fmt.Fprintf(out, "SQLite database snapshot created: %s\n", created)
	fmt.Fprintln(out, "This snapshot contains database state only. Preserve required local/S3 attachment bytes, deployment configuration, and secret material separately for full-instance recovery.")
	return nil
}
