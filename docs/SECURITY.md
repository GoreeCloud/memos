# Security

GoreeCloud Memos is security-sensitive because it stores private notes, attachments, credentials-adjacent content, and personal metadata.

Current rebuild controls include:

- new instances initialize **private** even when a canonical external URL is configured;
- normal memo persistence already defaults to private at the database level;
- authentication and authorization remain server-enforced;
- upstream rate limiting and import validation are retained;
- optional external AI integrations remain inactive until explicitly configured;
- arbitrary instance-provided JavaScript injection is disabled in the GoreeCloud browser client;
- response hardening sets CSP trust-boundary directives, Permissions-Policy, Referrer-Policy, X-Content-Type-Options, and X-Frame-Options across the HTTP application;
- upstream provenance is retained so security fixes can be reviewed and merged;
- secrets must remain outside source control and ordinary documentation.

Open gates include Wardveil integration, dependency/security scanning, hostile-file validation, production deployment review, backup/restore validation, signing/provenance, and representative penetration/security acceptance.
Demo mode is an explicit public demonstration exception intended for synthetic/demo content; it must not be used as the deployment mode for private user data.
