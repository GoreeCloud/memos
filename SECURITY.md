# GoreeCloud Memos Security Policy

GoreeCloud Memos is a maintained fork of usememos/memos. Security is treated as a release-blocking responsibility for the GoreeCloud fork.

## Supported line

Only the current GoreeCloud development/release line is supported. Until a GoreeCloud release is explicitly promoted, this repository remains Development and must not be represented as production-approved, Seal-qualified, or Anchor-qualified.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in a public issue, discussion, pull request, or social post.

Use GitHub's private vulnerability-reporting / Security Advisory path for GoreeCloud/memos when available. If that path is unavailable, contact the repository owner privately at admin@goreecloud.com.

Include the affected revision, deployment context, reproduction steps, expected/actual behavior, and any evidence needed to assess impact. Do not include live credentials, tokens, private notes, or unrelated user data.

## Fork security responsibilities

GoreeCloud is responsible for evaluating and integrating applicable upstream security fixes, dependency updates, protocol changes, migration changes, and security advisories. Upstream provenance is tracked in provenance/upstream.json and docs/UPSTREAM.md.

The GoreeCloud fork additionally enforces private-first initialization, does not execute administrator-supplied arbitrary CSS or JavaScript in the trusted browser shell, and keeps production claims gated on repository-local security, privacy, recovery, accessibility, Glaze, and platform-integration evidence.

## Deployment boundary

Self-hosting does not remove the need for TLS, authenticated administration, least privilege, protected secrets, controlled ingress, secure backups, restore testing, and prompt patching. Core operation must not require telemetry, advertising, a hosted control plane, remote fonts, or an external AI provider.
