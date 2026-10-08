# Security

GoreeCloud Memos is security-sensitive because it stores private notes, attachments, credentials-adjacent content, and personal metadata.

Current rebuild controls include:

- new instances initialize **private** even when a canonical external URL is configured;
- normal memo persistence already defaults to private at the database level;
- authentication and authorization remain server-enforced;
- upstream rate limiting and import validation are retained;
- optional external AI integrations remain inactive until explicitly configured;
- arbitrary instance-provided JavaScript injection is disabled in the GoreeCloud browser client;
- upstream provenance is retained so security fixes can be reviewed and merged;
- secrets must remain outside source control and ordinary documentation.
- a source-level, read-only Wardveil status consumer rejects stale, missing, malformed, or sensitive evidence and never authorizes Protected by Wardveil without current authoritative evidence;



## Personal access tokens

Personal access tokens (PATs) authenticate API requests with the authority of the account that created them. Treat a PAT like a password or session credential:

- create a separate token for each application or automation so access can be revoked independently;
- grant a token only to software and devices you trust;
- prefer an expiration date when persistent access is not required;
- send the token only over a trusted HTTPS connection outside intentionally local development;
- never place reusable tokens in source control, screenshots, ordinary documentation, or shared logs;
- rotate or delete a token immediately if it may have been exposed; and
- review active tokens periodically and remove tokens that are no longer required.

The token value is shown only when it is created. GoreeCloud Memos stores the token record needed for validation but must not treat ordinary UI or logs as a place to redisplay or persist the reusable secret.

A PAT does not create a new authorization role. Requests made with a PAT act with the account authority represented by that token and remain subject to server-side authorization checks.

Open gates include live Wardveil provider transport, authentication, runtime acceptance, security-event delivery, and production approval; dependency/security scanning; hostile-file validation; production deployment review; backup/restore validation; signing/provenance; and representative penetration/security acceptance.
Demo mode is an explicit public demonstration exception intended for synthetic/demo content; it must not be used as the deployment mode for private user data.
