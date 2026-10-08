# API

GoreeCloud Memos retains the inherited Memos v1 application API surface for same-origin and authorized client use. The fork keeps protocol compatibility where practical while applying GoreeCloud privacy, security, and lifecycle requirements around deployment and use.

## Base path

The application exposes its primary API under `/api/v1`. Exact methods and message shapes are defined by the repository's protobuf and generated Connect clients.

Repository sources of truth include:

- `proto/api/v1/` — service and message definitions;
- `server/router/api/v1/` — server handlers and transport glue;
- `web/src/connect/` and generated client types — browser-client usage.

## Authentication

API requests are subject to the same server-side authorization model as the web client. Supported credentials may include the signed-in session and personal access tokens, depending on the endpoint and client.

Treat personal access tokens as reusable credentials. See [Security — Personal access tokens](SECURITY.md#personal-access-tokens).

## Compatibility

GoreeCloud Memos is a maintained fork. The `v1` label is an application API namespace, not a promise that every unreleased upstream change will be adopted automatically. Upstream API changes are reviewed through the fork's governed intake process.

## Privacy and external clients

An external client can read or modify whatever the authenticated account is authorized to access. Use TLS outside intentionally local development, keep credentials out of URLs and logs, and revoke tokens that are no longer needed.

GoreeCloud Mesh and GoreeCloud Identity integrations are separate future platform-system work. Their absence does not weaken the existing server authorization requirement and must not be represented as completed integration.
