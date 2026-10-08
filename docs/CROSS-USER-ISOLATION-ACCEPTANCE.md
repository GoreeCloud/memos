# Cross-User Isolation Acceptance

GoreeCloud Memos treats multi-user isolation as a security boundary, not merely a product behavior.

This record consolidates current automated evidence for implemented user-scoped surfaces. It does not claim isolation for roadmap features that do not yet exist.

## Current dedicated acceptance

The dedicated API acceptance test `TestCrossUserCoreIsolationAcceptance` creates two regular users and proves that the second user cannot:

- read the owner's PRIVATE memo by name;
- surface that PRIVATE memo in their memo collection;
- update or delete the owner's PRIVATE memo;
- read the owner's attached private attachment metadata;
- change the owner's memo attachment binding;
- export the owner's personal Memos archive; or
- read the owner's saved memo view.

The test then re-reads the memo and saved view as the owner to prove that the denied operations did not mutate the owner's data.

## Existing supporting regression coverage

The broader suite already carries additional user-boundary evidence:

| Boundary | Existing regression evidence |
| --- | --- |
| Memo named reads/mutations/deletion | `server/api/v1/test/memo_service_test.go` |
| Memo attachments | `server/api/v1/test/memo_attachment_service_test.go`, `attachment_service_test.go`, and store attachment-access tests |
| Personal archive export | `server/api/v1/test/memo_export_test.go` |
| Saved memo views | `server/api/v1/test/memo_view_service_test.go` |
| User tag settings | `server/api/v1/test/user_setting_test.go` |
| Memo relations | `server/api/v1/test/memo_relation_service_test.go` and store relation-policy tests |
| Reactions | API and store reaction-policy tests |
| Memo sharing | API and store memo-share tests |
| User webhooks | `server/api/v1/user_webhook_test.go` |
| Space membership/administration | API and store Space policy tests |
| Instance statistics | `server/api/v1/test/instance_stats_test.go` |

## Acceptance boundary

This is Development security evidence for implemented server surfaces. It does **not** establish complete cross-user security acceptance for:

- reminder state that is not yet implemented in the GoreeCloud product scope;
- persisted recent-search history, which the current Development slice does not store;
- future synchronization/device queues;
- future desktop/mobile account caches;
- future platform-system transports;
- production penetration testing or threat-model acceptance; or
- independent security review of the Draft browser-header and trusted-proxy cookie changes.

Any new user-scoped persistence or API surface must add explicit same-user success and cross-user failure coverage before release qualification.
