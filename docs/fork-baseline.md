# Synchronization baseline

- Fork `main`: `b186636ae2cf5c7ab5853d1f4cd6bc27748e09f3`.
- Shared upstream ancestor: `ccb78f20438a853f0205b8ed7f642af7780208e6`.
- Imported upstream v2.4.0: `951fe5603a7ec0b2dcb6a0b95d92cd86f93ad9e5`.
- Published v1 maintenance source: `ContextVM/mcp-sdk` branch `v1.x`, package `@contextvm/mcp-sdk@1.30.0`.
- The four original fork main commits have no net source delta. The v1 branch defines the lightweight core-plus-stdio surface preserved here.

The original v2.3.1 import (`fcef852f6cdafea07f36cf6fae69b37c8adf85be`) and fork adjustments remain in history. A subsequent merge imports the exact v2.4.0 tag, preserving upstream ancestry and the same lightweight scope. Fork packaging, documentation, and regression coverage follow in a separate commit.

Upstream marks v2.4.0 as its latest stable release (published October 23, 2026). This update uses the release tag rather than unreleased `main`. It retains the tool-schema, resource-title, and forwarded-event fixes and the locked fast-uri 3.1.8 validator. The new opt-in Skills extension and HTTP/OAuth-specific changes stay outside this fork. Build, packed-artifact, and CVM acceptance checks qualify the retained surface.

The starting checkout had no installed workspace dependencies, so no pre-install unit-test result is claimed. Retained upstream protocol tests are run after synchronization; removed integration suites require transports outside this fork's supported scope. Packed-package checks replace upstream multi-package topology assertions.

`v1.x` is not merged or rewritten, and no npm publication is performed by these PRs.
