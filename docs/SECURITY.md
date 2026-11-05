# GoreeCloud Memos — Security Boundaries

The initial code is a single-user development preview, not a hardened multi-tenant service.

- Server refuses startup without a token of at least 24 characters; choose a cryptographically random secret.
- Binds to 127.0.0.1 by default; use a separately reviewed HTTPS reverse proxy before any network exposure.
- Data routes require a constant-time bearer token check; health and web static assets reveal no note content.
- No authentication cookies, permissive CORS, third-party scripts or user-supplied HTML rendering.
- Stale versioned writes return HTTP 409 rather than silently overwriting data.
- Known memo fields, color values, JSON sizes and maximum text lengths are validated.
- SQLite queries use bound parameters and memo bodies are displayed with DOM textContent.
- Browser token lives only in tab memory, note drafts in sessionStorage, and layout/theme in localStorage.
- Data is not encrypted by this app at rest. On POSIX hosts, the recommended **private development launcher** (`server/serve_private.py`) binds only to IPv4 loopback, validates the token before touching storage, and provisions a 0700 directory and 0600 database through the existing fail-closed helper. It sets process umask 077 for newly created files. The legacy `server/app.py` startup does **not** call this helper automatically, and any existing unsafe permissions require separate operator remediation. See [private storage](PRIVATE_STORAGE.md).
- JSON v2 export includes all memos and revision history, including trash, without the 2,000-result feed cap; treat it as sensitive data. The CLI's optional `export --output PATH` creates a private 0600 POSIX file with exclusive publication and failure cleanup, but the JSON remains plaintext. Legacy stdout export and shell redirection do not enforce those file permissions; see [backup and recovery](BACKUP_AND_RECOVERY.md).
- Safe Markdown subset rendering uses DOM elements and text nodes, never unsanitized HTML. External link hrefs only accept HTTP(S) with noreferrer/noopener. Both the renderer and link policy have Node.js regression tests.
- The Python CLI and native GTK4 client now reject HTTP redirects and environment-configured HTTP proxy routing when sending bearer tokens. They require HTTPS for non-loopback API hosts; cleartext HTTP is accepted only for numeric loopback addresses (such as `127.0.0.1` and `[::1]`). GTK transport policy is statically checked by CI, not exercised in a graphical integration test.
- A single shared instance token is not a user account or authorization system.
- Consistency-aware online SQLite backup, read-only verify and non-overwriting restore commands are included. Backups are not encrypted, scheduled, retained or externally replicated. See BACKUP_AND_RECOVERY.md. Additional recovery drills remain required before production.
- GC UI token alignment does not establish platform-wide visual/accessibility approval.
- Threats still to resolve: brute-force/rate limits, identity/SSO, comprehensive audit logging, migration safety, attachment scanning and quotas, authenticated AI/webhook access, secret rotation, TLS, disaster recovery and accessibility QA.
