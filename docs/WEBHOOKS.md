# Webhooks

GoreeCloud Memos can send configured webhook requests for supported user events. Webhooks are optional outbound integrations and may disclose event data to the destination you configure.

## Before adding a webhook

- use HTTPS for non-local destinations;
- choose a destination you control and trust;
- minimize the data exposed to the receiving service;
- do not embed reusable credentials in a URL;
- rotate any destination-side secret independently of GoreeCloud Memos;
- review network egress policy and DNS behavior for self-hosted deployments.

Administrators should treat webhook destinations as external data processors unless the endpoint is fully controlled inside the same trusted environment.

## Failure boundary

A remote webhook endpoint is not part of GoreeCloud Memos' durable note store. Delivery failures must not corrupt memo data or turn an optional integration into a requirement for core note capture.

Future Wardveil, Privacy Shield, Policy, and Observability integrations may add governed controls and evidence around outbound webhook behavior. Those integrations are not implied merely because the inherited webhook feature is available.
