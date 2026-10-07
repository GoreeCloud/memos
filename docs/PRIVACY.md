# Privacy

GoreeCloud Memos is private-first and self-hosted.

Core operation must not require advertising, third-party analytics, hosted telemetry, remote fonts, a proprietary control plane, or external AI processing. Optional integrations must be deliberate, disclosed, and replaceable.

The rebuild defaults new instances to private regardless of whether an external instance URL is configured. Public or shared access remains an explicit administrator/user decision.

User-owned notes and attachments remain exportable. Future backup integration must minimize metadata, exclude reusable secrets from ordinary backup bundles, and support clean-target restoration.

Maps, webhooks, identity providers, object storage, AI providers, and other external integrations may disclose data to the configured provider; they are optional and must not be represented as local-only behavior.
Demo mode is an explicit public demonstration exception intended for synthetic/demo content; it must not be used as the deployment mode for private user data.
