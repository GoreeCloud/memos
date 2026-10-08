# Contributing to GoreeCloud Memos

GoreeCloud Memos is a GoreeCloud-maintained fork of the MIT-licensed `usememos/memos` project. Contributions must preserve upstream attribution where applicable while following GoreeCloud privacy, security, repository, Glaze, and lifecycle boundaries.

## Before changing code

1. Confirm the work belongs in `GoreeCloud/memos` and is not better handled upstream or in another GoreeCloud repository.
2. Read `README.md`, `AGENTS.md`, `SECURITY.md`, `docs/UPSTREAM.md`, `docs/VALIDATION.md`, and the relevant architecture/security/privacy/integration documentation.
3. Base work on current protected `main`.
4. Keep each branch and pull request narrow enough to review, test, and roll back independently.
5. Do not include credentials, private user data, production secrets, recovery material, or sensitive environment values.

For suspected vulnerabilities, do not open a public issue. Follow `SECURITY.md`.

## Branches and pull requests

Material changes use pull requests into protected `main`.

A candidate is not merge-ready merely because it builds. Before integration:

- refresh the candidate against current `main` without rewriting shared history;
- identify the exact head revision being proposed;
- resolve review threads and blocking findings;
- pass every required exact-head check on that exact revision;
- keep documentation and provenance aligned with the proposed behavior; and
- obtain specialized independent review when the change crosses a security, privacy, authentication, authorization, cryptographic, data-recovery, or other governed trust boundary; security-sensitive trust-boundary changes require independent human security review.

The current GoreeCloud validation matrix includes:

- `Repository and policy boundary`;
- `Frontend quality and build`;
- `Backend privacy and build`;
- `Database upgrade (sqlite)`;
- `Database upgrade (mysql)`; and
- `Database upgrade (postgres)`.

If the candidate head changes after validation, the new head is a new candidate and requires fresh validation.

Do not force-push shared review history, bypass branch protection, fabricate approval, or merge a security-sensitive Draft merely because CI is green.

## Maintained-fork changes

When adapting upstream work:

- preserve upstream author attribution and licensing;
- record the reviewed upstream commit or release when relevant;
- prefer selective, coherent intake over silently rebasing to unreleased upstream `main`;
- update `docs/UPSTREAM.md` and provenance when the maintained-fork baseline or upstream relationship materially changes; and
- retain GoreeCloud product identity, privacy defaults, hardening, Glaze presentation, and platform-integration boundaries.

The stable fork baseline remains whatever `provenance/upstream.json` declares; upstream `main` is not an automatic source of production authority.

## Local validation

Run the smallest relevant focused tests while developing, then the repository boundary before submitting:

```bash
python3 scripts/validate_goreecloud.py
git diff --check
```

For frontend changes:

```bash
cd web
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

For backend changes:

```bash
go vet ./...
go test ./...
go build ./cmd/memos
```

Database migration or driver-sensitive changes must also satisfy the repository's SQLite/MySQL/PostgreSQL upgrade acceptance path.

## Documentation expectations

Update only claims supported by the exact implementation and evidence.

Repository-local documentation belongs under `docs/` unless a GitHub-specific file belongs under `.github/`. Do not duplicate GitHub operational records into Google Drive. Live GitHub remains authoritative for branches, pull requests, reviews, checks, workflow runs, and merge state.

Do not describe a merged change as released, deployed, production-accepted, Seal-qualified, or Anchor-qualified unless those later states actually occurred.

## Review and merge boundary

A merge proves only that validated source entered protected `main`. It does not prove that a release exists, an artifact was published, production was deployed, recovery is complete, or the product is production-approved.

See `docs/RELEASE-AND-ROLLBACK.md` for the separate release, deployment, rollback, and production-acceptance boundaries.
