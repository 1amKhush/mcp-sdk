# Migrate from v1 to v2

The package name stays `@contextvm/mcp-sdk`. Supported subpaths, including `.js` aliases, remain. The APIs behind those paths follow upstream v2.3.1; this is a major upgrade, not a v1 compatibility shim.

| v1 usage                                                    | v2 change                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Node 18+                                                    | Node 20+ for supported process runtimes                                              |
| Zod 3.25 or 4                                               | Standard Schema; use Zod >=4.2                                                       |
| `.tool()`, `.prompt()`, `.resource()`                       | `registerTool`, `registerPrompt`, `registerResource` with config objects             |
| raw field maps                                              | Prefer explicit `z.object(...)`                                                      |
| `setRequestHandler(RequestSchema, handler)`                 | `setRequestHandler('method/name', handler)`                                          |
| `extra.signal`, `extra.requestId`, `extra.sendNotification` | `ctx.mcpReq.signal`, `ctx.mcpReq.id`, `ctx.mcpReq.notify`                            |
| `callTool(params, schema, options)`                         | `callTool(params, options)` for spec methods                                         |
| `McpError`, `ErrorCode`                                     | `ProtocolError`, `ProtocolErrorCode`; local failures use `SdkError` / `SdkErrorCode` |
| experimental task execution                                 | Removed upstream; no runtime compatibility layer                                     |

Use `@contextvm/mcp-sdk/types.js` for schemas, types, constants, predicates, and error classes. Use `validation/ajv` or `validators/cf-worker` for explicit validators. Default validation uses Ajv on Node and the Workers-compatible validator in browser/workerd builds.

List methods aggregate pages unless given an explicit cursor. Missing advertised capabilities return empty lists unless strict capability enforcement is enabled. Invalid/unknown tool calls can reject with protocol errors; do not assume every tool failure is a successful result with `isError`.

`ResourceTemplate` on the server entry is the helper class; the wire type is named `ResourceTemplateType`. Legacy type aliases and changed method signatures are not recreated.

The [pinned upstream migration guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.3.1/docs/migration/upgrade-to-v2.md) explains all v2 behavior changes. Its HTTP/OAuth sections describe surfaces excluded from this fork; its codemod is written for upstream package names.

No CVM SDK dependency is changed by this repository. A later CVM migration must update source call sites as well as its manifest.
