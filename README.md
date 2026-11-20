# @contextvm/mcp-sdk [![MIT licensed](https://img.shields.io/npm/l/%40contextvm%2Fmcp-sdk)](https://github.com/ContextVM/mcp-sdk/blob/main/LICENSE)

<details>
<summary>Table of Contents</summary>

- [Overview](#overview)
- [Fork Scope](#fork-scope)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Package Exports](#package-exports)
- [Publishing Notes](#publishing-notes)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

</details>

## Overview

[`@contextvm/mcp-sdk`](package.json) is a lightweight fork of the upstream MCP TypeScript SDK tailored for ContextVM and other local-process integrations that only need the MCP protocol core plus `stdio` transport.

This fork keeps the core protocol runtime and high-level client/server APIs while intentionally removing the HTTP, SSE, WebSocket, Express, Hono, and OAuth-oriented surfaces that added weight without helping the stdio use case.

It makes it easy to:

- Create MCP servers that expose resources, prompts, and tools
- Build MCP clients that can connect to local MCP servers
- Use the retained `stdio` transport with a smaller dependency footprint

## Fork Scope

Supported in this package:

- MCP protocol types and schemas
- Core protocol runtime
- High-level [`Client`](src/client/index.ts:234) and [`Server`](src/server/index.ts:129) APIs
- [`McpServer`](src/server/mcp.ts:72)
- [`StdioClientTransport`](src/client/stdio.ts:92) and [`StdioServerTransport`](src/server/stdio.ts:12)
- Experimental tasks support

Explicitly not included in this fork:

- Streamable HTTP transport
- Legacy SSE transport
- Express and Hono integrations
- OAuth/auth helper stack
- Browser/web transport layers

## Installation

```bash
npm install @contextvm/mcp-sdk zod
```

This SDK has a required peer dependency on `zod` for schema validation. The package internally imports from `zod/v4`, while remaining compatible with projects using Zod v3.25 or later.

## Quick Start

```typescript
import { McpServer } from '@contextvm/mcp-sdk/server';
import { StdioServerTransport } from '@contextvm/mcp-sdk/server/stdio';
import { z } from 'zod';

const server = new McpServer({
    name: 'example-server',
    version: '1.0.0'
});

server.tool('echo', { message: z.string() }, async ({ message }) => ({
    content: [{ type: 'text', text: message }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Core Concepts

### Servers and transports

An MCP server is typically created with [`McpServer`](src/server/mcp.ts:72) and connected to [`StdioServerTransport`](src/server/stdio.ts:12) for local, process-spawned integrations.

### Tools, resources, prompts

- **Tools** let LLMs ask your server to take actions (computation, side effects, network calls).
- **Resources** expose read-only data that clients can surface to users or models.
- **Prompts** are reusable templates that help users talk to models in a consistent way.

The retained server surface still includes tools, resources, prompts, completions, logging, elicitation, sampling, and experimental tasks.

### Capabilities: sampling, elicitation, and tasks

The SDK includes higher-level capabilities for richer workflows:

- **Sampling**: server-side tools can ask connected clients to run LLM completions.
- **Form elicitation**: tools can request non-sensitive input via structured forms.
- **URL elicitation**: servers can ask users to complete secure flows in a browser (e.g., API key entry, payments, OAuth).
- **Tasks (experimental)**: long-running tool calls can be turned into tasks that you poll or resume later.

### JSON Schema validation (opt-in)

Tool `outputSchema` validation (on the client) and elicitation response validation (on the server) are **opt-in**. By default the SDK does not bundle a JSON Schema validator, so these responses are returned without validation.

To enable validation, import [`AjvJsonSchemaValidator`](src/validation/ajv-provider.ts:27) from the dedicated subpath and pass it to the client and/or server:

```typescript
import { Client } from '@contextvm/mcp-sdk/client';
import { AjvJsonSchemaValidator } from '@contextvm/mcp-sdk/validation/ajv';

const client = new Client(
    { name: 'my-client', version: '1.0.0' },
    { jsonSchemaValidator: new AjvJsonSchemaValidator() }
);
```

Keeping validation opt-in means the [`ajv`](package.json) runtime is only loaded when you actually import the validator — consumers that don't need output validation ship a smaller bundle. Note that [`McpServer`](src/server/mcp.ts:72) still validates its own tool inputs/outputs against their Zod schemas directly (via Zod), independent of this optional JSON Schema validator.

These higher-level capabilities are preserved in the stdio-focused fork.

### Clients

The high-level [`Client`](src/client/index.ts:234) class connects to MCP servers over the retained [`StdioClientTransport`](src/client/stdio.ts:92) and exposes helpers like `listTools`, `callTool`, `listResources`, `readResource`, `listPrompts`, and `getPrompt`.

### Node.js compatibility

This fork targets Node.js 18+ and is optimized for local stdio-based integrations.

## Package Exports

- `@contextvm/mcp-sdk`
- `@contextvm/mcp-sdk/client`
- `@contextvm/mcp-sdk/client/stdio`
- `@contextvm/mcp-sdk/server`
- `@contextvm/mcp-sdk/server/stdio`
- `@contextvm/mcp-sdk/experimental`
- `@contextvm/mcp-sdk/experimental/tasks`

## Publishing Notes

This package is intended to be published as a public npm package under the [`@contextvm/mcp-sdk`](package.json) name. The published tarball only includes [`dist`](package.json:63) output.

## Documentation

- [Model Context Protocol documentation](https://modelcontextprotocol.io)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [ContextVM fork plan](docs/FORK_PLAN.md)
- [Upstream sync procedure](docs/upstream-sync.md)

## Release Workflow

Build the publishable package with [`npm run build`](package.json:71), inspect the tarball with [`npm pack --dry-run`](package.json), and publish with `npm publish --access public` once the [`@contextvm/mcp-sdk`](package.json:2) scope is ready.

## Contributing

Issues and pull requests are welcome on GitHub at <https://github.com/ContextVM/mcp-sdk>.

## License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for details.

## Validation limits

`McpServer` rejects tool arguments with more than 1,000 total array elements and object members before running schema validation. Override `maxToolInputElements` in the server options for larger legitimate inputs; use `Infinity` only with trusted callers. At most five
asynchronous tool-input validations run concurrently per server; additional calls receive an error. The stdio read buffer separately defaults to 10 MiB.

Use Zod 4.6.7 or later for constrained collection validation. Keep Node and Bun patched as well: use at least Node 22.23.4 on 22.x, Node 24.22.1 on 24.x, or Bun 1.4.4. Session IDs in the experimental in-memory task store identify task owners; applications must supply the
authenticated transport session ID.
