import * as z from 'zod/v4';
const name = process.argv[2];
const modern = process.argv[3] === 'modern';
const { McpServer } = await import(`${name}/server/mcp`);
const { StdioServerTransport, serveStdio } = await import(`${name}/server/stdio`);
function server() {
    const instance = new McpServer({ name: 'stdio-acceptance', version: '1' });
    instance.registerTool('echo', { inputSchema: z.object({ text: z.string() }) }, async ({ text }) => ({
        content: [{ type: 'text', text }]
    }));
    return instance;
}
if (modern) serveStdio(server);
else await server().connect(new StdioServerTransport());
