#!/usr/bin/env bash
set -euo pipefail

driver="${DRIVER:-sqlite}"

case "$driver" in
  sqlite|mysql|postgres)
    ;;
  *)
    echo "Unsupported DRIVER: $driver" >&2
    exit 2
    ;;
esac

export DRIVER="$driver"

tests='^(TestMigrationRejectsDowngrade|TestMigrationRejectsPreV022Installation|TestMigrationAcceptsMinimumSupportedVersion|TestUpgradeFromPreviousStableRenamesShortcutsToMemoViews|TestMigrationFromStableVersion|TestMigrationFromV0262PreservesLegacyData|TestMigrationMultipleReRuns|TestMigrationUniqueEmail)$'

echo "Running GoreeCloud database upgrade acceptance for DRIVER=$DRIVER"
go test -v ./store/test -run "$tests" -count=1
