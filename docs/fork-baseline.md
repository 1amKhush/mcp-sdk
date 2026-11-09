# Synchronization baseline

- Fork `main`: `b186636ae2cf5c7ab5853d1f4cd6bc27748e09f3`.
- Shared upstream ancestor: `ccb78f20438a853f0205b8ed7f642af7780208e6`.
- Imported upstream v2.3.1: `fcef852f6cdafea07f36cf6fae69b37c8adf85be`.
- Published v1 maintenance source: `ContextVM/mcp-sdk` branch `v1.x`, package `@contextvm/mcp-sdk@1.30.0`.
- The four original fork main commits have no net source delta. The v1 branch defines the lightweight core-plus-stdio surface preserved here.

The merge commit preserves upstream ancestry. The following fork commit removes concrete network/auth integrations, restores the single package and aliases, and updates validation/tooling.

The starting checkout had no installed workspace dependencies, so no pre-install unit-test result is claimed. Retained upstream protocol tests are run after synchronization; removed integration suites require transports outside this fork's supported scope. Packed-package checks replace upstream multi-package topology assertions.

`v1.x` is not merged or rewritten, and no npm publication is performed by these PRs.
