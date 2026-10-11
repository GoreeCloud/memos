# Refresh-Cookie Transport Trust — Development Candidate

## Scope
The `memos_refresh` cookie keeps `HttpOnly`, `SameSite=Lax`, and its existing expiration/rotation behavior. The `Secure` attribute must be based on direct TLS or an HTTPS scheme asserted by the **configured trusted immediate reverse proxy**, not on an untrusted client header.

## Source design
- The existing `internal/clientip` HTTP middleware owns a request-scoped verified secure-transport boolean beside its verified client IP.
- A direct request with a real TLS connection is secure.
- Without TLS, a malformed or untrusted network peer cannot supply the scheme via `X-Forwarded-Proto`, `Forwarded`, or `Origin`.
- For a configured trusted immediate proxy, the rightmost `X-Forwarded-Proto` scheme (or rightmost RFC 7239 `Forwarded` element when XFP is absent) determines the transport. Exact `https` matching prevents substring-based spoofing.
- `Origin` is never accepted as transport proof.
- The AuthService consumes only the verified context, so Connect and gRPC-Gateway paths reuse the same HTTP boundary. New refresh tokens and cookie clearing use identical attribute inference.
- Loopback HTTP Development remains available without `Secure` when no trusted HTTPS forwarding is present.

The trusted-proxy policy still defaults to `private`. Operators must configure the trusted proxy ranges correctly, and edge proxies must overwrite or safely append forwarding headers. This change is not evidence of security against a misconfigured network trust boundary.

## Acceptance and open questions
- Run the exact-head Go suite, frontend suite, rendered Chromium acceptance and all three database upgrade checks.
- Exercise direct TLS, trusted proxy HTTPS, untrusted spoofing, malformed/multiple forwarding values and session rotation/clearance under the existing unit/integration tests.
- Independently confirm any native-gRPC transport that does not traverse the Echo HTTP middleware. Direct native gRPC needs a verified transport signal rather than untrusted metadata; no unsupported compatibility claim is made here.
- Verify authenticated production-edge/ingress configuration and representative browser cookie behavior before any existing-volume deployment or security release claim.
- Keep [issue #22](https://github.com/GoreeCloud/memos/issues/22) open until transport-specific and production-boundary acceptance is complete.

This is a **Development source candidate**, not a completed security audit, Stable feature, or deployment authorization.
