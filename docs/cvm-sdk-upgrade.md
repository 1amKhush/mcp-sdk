# CVM TypeScript SDK upgrade report

## Verdict

**Ready for a separate, coordinated CVM SDK migration; not a manifest-only bump.** The production SDK dependency remains unchanged by these PRs. Current Nostr protocol behavior must stay on the legacy initialization path; modern Nostr support is not established by these results.

The pinned CVM SDK source is `3949fe3b8513a93f2f99edc05e811b131ed84967` (`@contextvm/sdk@0.14.3`). The baseline package is `@contextvm/mcp-sdk@1.30.0`; the candidate is the actual packed v2.3.1 artifact built from upstream `fcef852f6cdafea07f36cf6fae69b37c8adf85be` plus the documented fork trimming.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm build:all
pnpm check:all
pnpm test:conformance
pnpm test:acceptance
```

The CVM harness requires Bun 1.3.14 and Git/registry access. It checks out the pinned source into a temporary directory, installs its frozen lockfile, runs the v1 baseline, applies the checked-in test-only API migration patch, injects the packed v2 artifact, then repeats the same suites. It does not edit the caller's CVM SDK checkout or manifest. Optional `CVM_SDK_REPOSITORY` and `CVM_SDK_NODE_MODULES` reuse a local Git object store and dependency snapshot; source SHA and baseline package version are still checked. `BUN_BIN` selects a Bun binary outside PATH. CI uses a fresh checkout and frozen installation.

Generated evidence is in `results/wire/{v1,v2}.json`, `results/cvm/{v1,v2}.log`, and `results/cvm/summary.json`. Results are ignored by Git; CI uploads them as artifacts. `test/acceptance/cvm-v2.patch` contains only the adaptations used for comparison.

## Observed compatibility

| Change                                  | Observed difference                                                                                                           | CVM impact                                                                       | Required adjustment                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy initialization and announcements | Both packages request `2025-11-25`; stateful/stateless and announcement tests pass in both runs                               | No implicit switch to the modern revision                                        | Review both announcement and emulated-handshake uses of `LATEST_PROTOCOL_VERSION` at every future upgrade; preserve current negotiated behavior |
| Custom metadata and progress tokens     | The same `_meta` payload and stable progress token reach handlers and results                                                 | CEP-41 metadata and CEP-8 negotiation remain usable                              | Read handler metadata from `ctx.mcpReq._meta`; keep sender isolation and existing stream routing                                                |
| Custom JSON-RPC errors and IDs          | Numeric initialization ID `0`, string request IDs, code `-32043`, and custom error data survive; error message prefix changes | Payment routing by code/data remains valid; message matching can change          | Match error codes/data, not the removed `MCP error <code>:` prefix                                                                              |
| List pagination                         | A no-cursor list returns one page plus `nextCursor` in v1, both pages in v2; explicit-cursor calls match                      | Automatic list aggregation can change call counts and announcement snapshots     | Remove redundant manual loops where appropriate; use explicit requests for page-level behavior                                                  |
| Unknown tools                           | v1 returns `isError: true`; v2 rejects with `ProtocolError(-32602)`                                                           | A result-only failure branch misses v2 rejection                                 | Handle rejected protocol errors separately from tool execution results                                                                          |
| Tool argument validation                | Invalid arguments remain a tool error result in the recorded scenario                                                         | Error text can change independently of its category                              | Assert codes and structured behavior instead of a whole formatted message                                                                       |
| Malformed JSON-RPC                      | Both tested fork versions drop the invalid frame, report `onerror`, and send no response                                      | No newly introduced difference for this case                                     | Do not wait for a JSON-RPC response to a frame that fails message-shape guards                                                                  |
| Spec method signatures                  | `callTool(params, undefined, options)` becomes `callTool(params, options)`                                                    | Keeping the third argument silently loses stream progress options                | Apply the production `call-tool-stream.ts` change in the fixture patch; update other consumer calls                                             |
| Handler registration/context            | Schema-first registration becomes method strings; flat `_meta` becomes `mcpReq._meta`                                         | Resource subscriptions and user-authored streaming callbacks need source changes | Apply the fixture mappings and update external server/tool callback examples                                                                    |
| stdio interoperability                  | v1 client/v2 server, v2 client/v1 server, v2 legacy pair, and v2 opt-in modern pair all pass                                  | Existing process bridges work; modern stdio support remains available            | Keep stdio subpath imports separate from browser entry points                                                                                   |
| Runtime/types                           | Candidate requires Node 20+ and Zod >=4.2; fork module paths remain                                                           | CVM's documented Node 18 baseline must be raised before adoption                 | Update runtime documentation/CI in the later CVM PR; use v2 errors/types rather than recreating removed aliases                                 |
| Experimental tasks                      | Upstream task execution APIs are removed; deprecated wire vocabulary remains                                                  | Any application using task execution needs a separate replacement                | Inventory actual users; do not confuse upstream tasks with CVM CEP-41 streams                                                                   |

## Acceptance evidence and limits

- Retained upstream source tests: 95 files, 1,623 passing tests.
- Full pinned CVM source/test type-checking is part of the harness, before each runtime suite. The fixture patch also wraps authoring schemas in `z.object(...)`, removes obsolete schema imports, and updates context type annotations; the initial runtime-only patch exposed 54 test/mocks typing errors that these changes resolve.
- Pinned CVM suites: 73 files, 586 passing tests on v1 and 586 on the adapted v2 candidate; zero failures in both. Five external LNbits/NWC/Zap tests stay disabled, as in the baseline. Fake payment processors and local relay fixtures exercise payment/transport behavior without spending money.
- CVM coverage includes Nostr stateful/stateless operation, announcements, stdio gateway/proxy, concurrent clients, sender isolation, resource updates, CEP-41 duplex streams/abort/progress, oversized transfer, and CEP-8 gating/retries/cleanup.
- Packed artifact verification covers 43 public import paths in ESM/CJS, external-project declarations, dependency closure, and browser bundling. Four subprocess stdio scenarios cover mixed-version legacy operation and modern discovery.
- Wire assertions compare the actual v1/v2 packages. Captures normalize generated request IDs while preserving message sequence, protocol values, metadata, error codes/data, and result fields. Explicit assertions check numeric/string ID preservation before normalization.
- `test:conformance` runs the retained upstream frozen-wire/schema contract tests and stdio transport tests. It does not claim execution of the external MCP conformance CLI. That upstream runner is HTTP-oriented and its concrete HTTP/OAuth suites are excluded with those transports.
- Modern stdio is tested. Modern Nostr discovery, per-request envelopes, `subscriptions/listen`, multi-round-trip input, and modern cancellation are a later protocol migration; the existing CVM acceptance runs deliberately retain legacy negotiation.

The remaining adoption work belongs together in the later CVM SDK PR: update the dependency, move progress options to the new argument position, migrate handler APIs/examples/tests to explicit schema objects and nested context, raise the supported runtime, and rerun these same checks. No production CVM dependency change or npm publication is included here.
