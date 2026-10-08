# Outbound Network Behavior

GoreeCloud Memos is private-first and self-hosted. Core note capture, local password authentication, database persistence, search, export/import, and the built-in web application do not require advertising, third-party analytics, hosted telemetry, remote fonts, a proprietary GoreeCloud control plane, or an external AI service.

This document inventories product-managed network paths in the current Development source. It distinguishes server-originated traffic from browser-originated traffic and records the condition that activates each path. It is not a claim that every optional integration has completed production privacy/security acceptance.

## Server-originated traffic

| Path | Activation | Destination and data boundary | Current safeguards |
| --- | --- | --- | --- |
| Link metadata preview | A client invokes the link-metadata API for an http/https URL. | The Memos server requests the target URL and may follow safe redirects. The destination observes the server network address, requested URL/path, and the GoreeCloud Memos link-preview User-Agent. Returned HTML/oEmbed metadata is parsed for preview fields. | Internal/private/link-local/CGNAT destinations are rejected, DNS is resolved before dialing to resist rebinding, redirects are revalidated, proxy inheritance is disabled, request time and response sizes are bounded, concurrency is bounded, and failures are cached briefly. |
| User webhooks | A user explicitly creates a webhook and a covered memo event occurs. | The configured http/https endpoint receives a JSON event payload. Depending on the event and current authorization, that payload can contain memo fields. | Reserved/private destinations are blocked by default at validation and dial time, explicit private-destination allowlisting is available for governed self-hosting, DNS rebinding is resisted, delivery is bounded by timeout/queue/response size, and configured signing secrets produce Standard Webhooks HMAC headers. |
| OAuth2/OIDC identity provider | An administrator configures an external identity provider and a user chooses that provider for sign-in or account linking. | The server exchanges authorization material with configured provider endpoints and may request user-info claims. Provider/client credentials and resulting identity claims are handled by the identity-provider flow. | This path is inactive without provider configuration. GoreeCloud Identity remains a separate blocked platform integration; inherited OAuth/OIDC must not be represented as authoritative GoreeCloud Identity. |
| S3-compatible attachment storage | An administrator configures S3 storage and attachments use it. | Attachment bytes and object operations are sent to the configured S3-compatible endpoint using configured bucket/credentials. | Local/database storage remains available. S3 credentials are treated as secret configuration, attachment API responses do not expose presigned storage URLs as durable metadata, and insecure TLS verification is opt-in and explicitly weakens transport protection. |
| OpenAI-compatible transcription | An administrator configures an OpenAI-compatible AI provider and a user explicitly invokes audio transcription. | Recorded/uploaded audio plus transcription parameters are sent to the configured endpoint. The default endpoint, when that provider is configured without an override, is api.openai.com. | No AI provider is required for core operation. An API key is required, the provider is inactive until configured, and the action is user-invoked. |
| Gemini audio transcription | An administrator configures Gemini and a user explicitly invokes audio transcription. | Audio bytes and transcription instructions are sent to the configured Gemini endpoint. | No AI provider is required for core operation. An API key is required, the provider is inactive until configured, supported audio types and inline size are bounded, and the action is user-invoked. |

## Browser-originated traffic

| Path | Activation | Data boundary |
| --- | --- | --- |
| Map styles and tiles | A user opens map/location presentation that needs a basemap. | The browser can request map styles/tiles from OpenFreeMap and may fall back to OpenStreetMap tiles. Those providers observe ordinary browser request metadata and the requested map area/tiles. |
| Reverse geocoding | A view resolves a memo latitude/longitude into a place label. | The browser sends the coordinates to the configured Nominatim OpenStreetMap reverse-geocoding endpoint. |
| Proof-of-humanity widget assets | The instance profile exposes a configured Turnstile or hCaptcha challenge. | The browser loads the selected provider's JavaScript/widget and the provider receives the browser/network data inherent to that challenge flow. No challenge script is loaded when no supported challenge is configured. |
| User-authored external content and navigation | A user follows an external link or a rendered feature explicitly loads an external resource. | The user's browser communicates with that destination under normal browser rules. This is distinct from server-originated link-preview fetching. |

## Data-minimization expectations

- Optional external providers must remain disabled until deliberately configured or invoked.
- Core operation must not silently acquire a dependency on advertising, behavioral profiling, hosted analytics, hosted telemetry, remote fonts, or external AI.
- Reusable provider credentials must not be emitted in ordinary logs, API metadata, repository files, or portable user exports.
- Server-side fetchers must continue to treat internal-address access as a security boundary and fail closed unless an explicit governed exception exists.
- Features that transmit user content, audio, coordinates, identity claims, attachment bytes, or memo-event payloads must be represented as external-provider behavior rather than local-only processing.
- Production deployment review must inventory any additional reverse proxies, identity gateways, storage services, observability collectors, security providers, or GoreeCloud platform transports introduced outside this repository.

## Acceptance boundary

This inventory is source-level Development evidence. It does not prove that optional providers are trustworthy, that every deployment permits the same egress, that target providers meet GoreeCloud privacy requirements, or that live Privacy Shield/Wardveil/Identity/Mesh/Policy/Observability integration is accepted.

Any newly introduced product-managed outbound destination or new category of user data sent to an existing destination must update this inventory, the applicable privacy/security documentation, and tests or policy checks in the same development cycle.
