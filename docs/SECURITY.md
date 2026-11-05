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
- Data is not encrypted by this app at rest. Use protected filesystem permissions and encrypted disk storage.
- JSON export includes trash and must be treated as sensitive data.
- A single shared instance token is not a user account or authorization system.
- Consistency-aware backups and restore drills are required before production; automation is not included.
- GC UI token alignment does not establish platform-wide visual/accessibility approval.
- Threats still to resolve: brute-force/rate limits, identity/SSO, comprehensive audit logging, migration safety, attachment scanning and quotas, authenticated AI/webhook access, secret rotation, TLS, disaster recovery and accessibility QA.
