# Protocol policy

SDK version and protocol revision are separate. Plain `Client`, `Server`, and `McpServer` construction retains the legacy initialization path, whose latest revision is `2025-11-25` at the pinned upstream commit.

Modern `2026-07-28` operation is an explicit opt-in through client `versionNegotiation` and the stdio `serveStdio` entry. It uses discovery, per-request envelopes, subscriptions, and multi-round-trip results. The pure negotiation and wire codecs are retained; HTTP serving entries are excluded.

An SDK dependency upgrade does not certify modern Nostr support. Keep existing CVM protocol behavior until its discovery, announcements, stateless emulation, subscriptions, and cancellation have been migrated and tested together.

See the [pinned protocol guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.4.0/docs/migration/support-2026-07-28.md).
