# @contextvm/mcp-sdk

A lightweight MCP TypeScript SDK for ContextVM: protocol core, client/server APIs, custom transports, validation, and stdio.

This v2 fork tracks [upstream v2.4.0](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.4.0), commit `951fe5603a7ec0b2dcb6a0b95d92cd86f93ad9e5`. The v1 package remains on the `v1.x` maintenance branch.

## Install

```sh
npm install @contextvm/mcp-sdk@2.4.0 zod@^4.2.0
```

Requires Node 20+ for process transports. Core/custom-transport imports also bundle for browsers. Stdio imports are Node-only.

## Server

```ts
import { McpServer } from '@contextvm/mcp-sdk/server/mcp';
import { StdioServerTransport } from '@contextvm/mcp-sdk/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'echo', version: '1.0.0' });
server.registerTool(
    'echo',
    {
        inputSchema: z.object({ text: z.string() })
    },
    async ({ text }) => ({ content: [{ type: 'text', text }] })
);
await server.connect(new StdioServerTransport());
```

## Fork scope

Retained: `Client`, `Server`, `McpServer`, protocol types and Zod schemas, tools/resources/prompts, sampling, elicitation, progress/cancellation, custom `Transport`, in-memory transports, stdio, and runtime-selected JSON Schema validation.

Excluded: Streamable HTTP, legacy SSE and WebSocket transports, Express/Hono/Fastify/Node HTTP adapters, OAuth providers and middleware, migration codemods, the optional Skills extension (SEP-2640), and experimental task execution. Deprecated task wire types remain available where required for interoperability. Shared envelope/negotiation helpers remain because stdio and custom transports use them; their presence does not add an HTTP server.

The published artifact is one package. Internal upstream workspace packages are bundled and are not published as dependencies. Import paths accept both extensionless and `.js` aliases, including `client/index.js`, `server/mcp.js`, `types.js`, `inMemory`, and `shared/transport`.

See [migration](docs/migration.md), [protocol policy](docs/protocol-versions.md), and [fork baseline](docs/fork-baseline.md).

## Develop

```sh
pnpm install --frozen-lockfile
pnpm build:all
pnpm typecheck:all
pnpm lint:all
pnpm test:all
pnpm docs:check
pnpm test:package
```

Package checks install a packed artifact into a temporary project and verify exports, declarations, CJS/ESM, and browser bundling. They require registry access on a cold cache. Stdio tests require subprocess access.

## License

Upstream contributions include Apache-2.0 and earlier MIT code. The published package includes the complete [LICENSE](LICENSE) and [NOTICE](NOTICE).
