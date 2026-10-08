# Database Compatibility

## Scope

GoreeCloud Memos inherits upstream support for SQLite, MySQL, and PostgreSQL. GoreeCloud treats database compatibility as a release-critical portability and recovery boundary rather than assuming that a successful SQLite development run proves the other supported engines.

## Development acceptance matrix

The repository-local runner is:

```bash
DRIVER=sqlite ./scripts/run_database_upgrade_acceptance.sh
DRIVER=mysql ./scripts/run_database_upgrade_acceptance.sh
DRIVER=postgres ./scripts/run_database_upgrade_acceptance.sh
```

The GitHub Actions validation workflow runs those three lanes independently on the exact pull-request or main revision.

Current test-engine pins inherited by the repository test harness are:

- SQLite through the embedded Go driver used by the application test suite.
- MySQL 8.4.
- PostgreSQL 18.
- Historical Memos 0.30.0 as the previous-stable upgrade fixture.
- Historical Memos 0.26.2 as an older supported migration/data-preservation fixture.

## Critical behaviors covered

The bounded acceptance runner verifies:

- downgrade rejection;
- rejection of installations older than the supported migration floor;
- acceptance of the minimum supported schema;
- previous-stable upgrade to the current schema;
- v0.26.2 legacy-data preservation;
- repeated/idempotent migration;
- user-setting migration behavior; and
- unique-email migration behavior.

The migration tests also verify that post-upgrade writes remain possible and that specific legacy state is transformed without silently fabricating authorization state.

## Evidence boundary

A green matrix establishes Development evidence for the exact revision that ran. It does not establish production database certification, production-sized performance, deployment-specific backup/restore, rollback under operational load, cloud-provider compatibility, or Release Candidate/Seal/Anchor qualification.

Database engine/version changes must update the pinned test harness, this document, and exact-revision acceptance evidence together.
