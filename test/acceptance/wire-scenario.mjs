import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import * as z from 'zod/v4';

const name = process.argv[2];
const modern = name !== 'mcp-v1';
const { Client } = await import(`${name}/client`);
const { McpServer } = await import(`${name}/server/mcp`);
const { Server } = await import(`${name}/server`);
const { InMemoryTransport } = await import(`${name}/inMemory`);
const types = await import(`${name}/types.js`);
const trace = [];
function pair() {
    const transports = InMemoryTransport.createLinkedPair();
    for (const [index, transport] of transports.entries()) {
        const send = transport.send.bind(transport);
        transport.send = async (message, ...args) => {
            trace.push({ direction: index ? 'server' : 'client', message: JSON.parse(JSON.stringify(message)) });
            return send(message, ...args);
        };
    }
    return transports;
}
function handler(server, method, schema, fn) {
    server.setRequestHandler(modern ? method : types[schema], fn);
}
const server = new McpServer({ name: 'wire-server', version: '1' });
const seen = {};
server.registerTool(
    'echo',
    { inputSchema: z.object({ text: z.string() }), outputSchema: z.object({ text: z.string() }) },
    async ({ text }, context) => {
        const meta = modern ? context.mcpReq._meta : context._meta;
        seen.meta = meta;
        return { content: [{ type: 'text', text }], structuredContent: { text }, _meta: { 'cvm/test': 'preserved' } };
    }
);
server.registerTool('payment', { inputSchema: z.object({}) }, async () => {
    throw new (modern ? types.ProtocolError : types.McpError)(-32043, 'payment rejected', { 'cvm/payment': { invoice: 'fixture' } });
});
const [clientTx, serverTx] = pair();
const client = new Client({ name: 'wire-client', version: '1' });
await server.connect(serverTx);
await client.connect(clientTx);
seen.version = client.getServerVersion();
seen.protocolVersion = trace.find(event => event.message.method === 'initialize').message.params.protocolVersion;
seen.echo = await client.callTool({
    name: 'echo',
    arguments: { text: 'hello' },
    _meta: { progressToken: 'stable-token', 'cvm/request': { value: 1 } }
});
assert.equal(seen.meta['cvm/request'].value, 1);
assert.deepEqual(seen.echo.structuredContent, { text: 'hello' });
try {
    seen.unknown = await client.callTool({ name: 'missing' });
} catch (error) {
    seen.unknown = { rejected: true, code: error.code, name: error.name };
}
try {
    seen.invalidArguments = await client.callTool({ name: 'echo', arguments: { text: 1 } });
} catch (error) {
    seen.invalidArguments = { rejected: true, code: error.code, name: error.name };
}
try {
    seen.payment = await client.callTool({ name: 'payment', arguments: {} });
} catch (error) {
    seen.payment = { rejected: true, code: error.code, data: error.data };
}
const errors = [];
server.server.onerror = error => errors.push(error.message);
await clientTx.send({ jsonrpc: '2.0', id: 'invalid-shape', method: 'ping', params: 1 });
await new Promise(resolve => setTimeout(resolve, 10));
seen.malformed = {
    errors,
    replies: trace.filter(event => event.direction === 'server' && event.message.id === 'invalid-shape').map(event => event.message)
};
await client.close();
await server.close();

const paginated = new Server({ name: 'pages', version: '1' }, { capabilities: { tools: {} } });
handler(paginated, 'tools/list', 'ListToolsRequestSchema', async request => ({
    tools: [{ name: request.params?.cursor ? 'second' : 'first', inputSchema: { type: 'object' } }],
    ...(request.params?.cursor ? {} : { nextCursor: 'page2' })
}));
const [a, b] = pair();
const listClient = new Client({ name: 'list-client', version: '1' });
await paginated.connect(b);
await listClient.connect(a);
seen.list = await listClient.listTools();
seen.page = await listClient.listTools({ cursor: 'page2' });
await listClient.close();
await paginated.close();

const custom = new Server({ name: 'custom', version: '1' }, { capabilities: {} });
const paymentError = () => {
    throw new (modern ? types.ProtocolError : types.McpError)(-32043, 'payment rejected', { 'cvm/payment': { invoice: 'fixture' } });
};
if (modern) custom.setRequestHandler('cvm/payment', { params: z.object({}) }, paymentError);
else custom.setRequestHandler(types.RequestSchema.extend({ method: z.literal('cvm/payment') }), paymentError);
const [raw, customTx] = pair();
const replies = [];
raw.onmessage = message => replies.push(message);
await custom.connect(customTx);
await raw.start();
await raw.send({
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: { protocolVersion: types.LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'raw', version: '1' } }
});
await new Promise(resolve => setTimeout(resolve, 10));
await raw.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
await raw.send({ jsonrpc: '2.0', id: 'payment-id', method: 'cvm/payment', params: {} });
await new Promise(resolve => setTimeout(resolve, 10));
seen.paymentError = replies.find(message => message.id === 'payment-id');
assert.equal(replies[0].id, 0);
assert.equal(seen.paymentError.error.code, -32043);
assert.deepEqual(seen.paymentError.error.data, { 'cvm/payment': { invoice: 'fixture' } });
await raw.close();
await custom.close();

const tokens = new Map();
let nextId = 0;
function normalize(value, key) {
    if (key === 'id') {
        if (!tokens.has(value)) tokens.set(value, `id-${nextId++}`);
        return tokens.get(value);
    }
    if (Array.isArray(value)) return value.map(item => normalize(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
    return value;
}
writeFileSync(process.argv[3], JSON.stringify({ seen, trace: trace.map(event => normalize(event)) }, null, 2) + '\n');
