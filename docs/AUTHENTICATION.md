# Authentication

GoreeCloud Memos supports the inherited local account/password flow and configurable OIDC identity providers. Authentication is server-enforced and remains separate from presentation-layer branding.

## Local accounts

New deployments are private-first. Administrators establish approved accounts and should disable unnecessary registration paths for private family or organizational deployments after onboarding is complete.

Passwords, session cookies, personal access tokens, OIDC client secrets, and recovery material are credentials. They must not be committed to the repository, written into ordinary documentation, or exposed in logs.

## OIDC / SSO

An administrator may configure an OIDC provider when an external identity authority is required. Before enabling one:

- verify the issuer and redirect URIs;
- use a dedicated client registration;
- store client secrets outside source control;
- require HTTPS outside intentionally local development;
- validate account-linking and administrator-recovery behavior;
- review which identity claims are required and minimize unnecessary profile data.

Adding an OIDC provider does not by itself establish GoreeCloud Identity integration. Authoritative GoreeCloud Identity adoption remains a separately governed platform-system requirement.

## Sessions

Session and refresh-cookie behavior must preserve secure transport, server-side authorization, bounded lifetime, and explicit logout/revocation behavior. Reverse-proxy deployments must configure trusted proxy handling deliberately; untrusted forwarding headers must never be allowed to weaken cookie security.

See [Security](SECURITY.md) for the broader trust and hardening boundary.
