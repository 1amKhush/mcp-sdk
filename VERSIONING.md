# Versioning

`@contextvm/mcp-sdk` is the only published package. v2 follows the pinned upstream v2 baseline while retaining the lightweight fork scope. The v1 line remains on `v1.x`.

Breaking public API or runtime changes require a major version bump. Internal workspace packages are private and must not be published independently. The root workspace version is not the published SDK version.

Release automation is manual and publishes only `packages/sdk` after CI checks. npm publication is separate from preparing the two migration PRs.
