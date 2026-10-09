package main

import (
	"fmt"
	"io"

	"github.com/spf13/cobra"
)

func newRestoreCommand() *cobra.Command {
	restoreCmd := &cobra.Command{
		Use:   "restore",
		Short: "Restore bounded recovery artifacts into new targets",
	}

	var bundleDir, targetDataDir string
	sqliteLocalCmd := &cobra.Command{
		Use:   "sqlite-local",
		Short: "Restore a verified SQLite + relative managed-local bundle",
		Long: "Verify and restore a bounded SQLite + relative managed-local recovery bundle into a brand-new GoreeCloud Memos data directory. " +
			"The target must not already exist. S3 objects, absolute LOCAL references, deployment configuration, and reusable secrets remain separate recovery requirements.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runRestoreSQLiteLocalRecoveryBundle(cmd.Context(), bundleDir, targetDataDir, cmd.OutOrStdout())
		},
	}
	sqliteLocalCmd.Flags().StringVarP(&bundleDir, "bundle", "b", "", "existing verified SQLite + relative managed-local recovery bundle")
	sqliteLocalCmd.Flags().StringVarP(&targetDataDir, "data", "d", "", "new target Memos data directory (must not already exist)")
	if err := sqliteLocalCmd.MarkFlagRequired("bundle"); err != nil {
		panic(err)
	}
	if err := sqliteLocalCmd.MarkFlagRequired("data"); err != nil {
		panic(err)
	}

	restoreCmd.AddCommand(sqliteLocalCmd)
	return restoreCmd
}

func printSQLiteLocalRestoreBoundary(out io.Writer, target string) {
	fmt.Fprintf(out, "SQLite + managed-local recovery bundle restored to new data directory: %s\n", target)
	fmt.Fprintln(out, "Restore scope is bounded to the verified SQLite database and relative managed-local attachment files in the bundle. Configure required deployment settings separately before starting the restored instance.")
	fmt.Fprintln(out, "S3 objects, absolute LOCAL references, deployment/runtime configuration, and reusable secret material are not restored by this command.")
}
