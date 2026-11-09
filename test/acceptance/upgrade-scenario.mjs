import { writeFileSync } from 'node:fs';

const reference = process.argv[2] === 'v2.3.1';
const { Client, InMemoryTransport } = await import(reference ? 'mcp-v23-client' : '@contextvm/mcp-sdk/client');
const { McpServer, fromJsonSchema } = await import(reference ? 'mcp-v23-server' : '@contextvm/mcp-sdk/server');
const { AjvJsonSchemaValidator } = await import(reference ? 'mcp-v23-server/validators/ajv' : '@contextvm/mcp-sdk/validation/ajv');
const trace = [];
const seen = {};
const server = new McpServer({ name: 'upgrade-server', version: '1' });
const client = new Client({ name: 'upgrade-client', version: '1' });
const $defs = {
    Note: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    Text: { type: 'string' }
};
for (const [name, schema] of [
    ['named', { $ref: '#/$defs/Note', $defs }],
    ['union', { anyOf: [{ $ref: '#/$defs/Note' }], $defs }]
]) {
    server.registerTool(name, { outputSchema: fromJsonSchema(schema) }, async () => ({ content: [], structuredContent: { id: 'n1' } }));
}
server.registerTool('text', { outputSchema: fromJsonSchema({ $ref: '#/$defs/Text', $defs }) }, async () => ({
    content: [],
    structuredContent: 'x'
}));
const resource = server.registerResource('note', 'docs://note', { title: 'Old title' }, async uri => ({
    contents: [{ uri: uri.href, text: 'note' }]
}));
const [a, b] = InMemoryTransport.createLinkedPair();
for (const [index, transport] of [a, b].entries()) {
    const send = transport.send.bind(transport);
    transport.send = async (message, ...args) => {
        trace.push({ direction: index ? 'server' : 'client', message: JSON.parse(JSON.stringify(message)) });
        return send(message, ...args);
    };
}
try {
    await server.connect(b);
    await client.connect(a);
    seen.protocolVersion = trace.find(event => event.message.method === 'initialize').message.params.protocolVersion;
    seen.namedSchema = (await client.listTools()).tools.find(tool => tool.name === 'named').outputSchema;
    for (const name of ['named', 'union', 'text']) seen[name] = (await client.callTool({ name })).structuredContent;
    resource.update({ title: 'New title' });
    seen.resourceTitle = (await client.listResources(undefined, { cacheMode: 'bypass' })).resources[0].title;
    seen.schemaUris = ['my_tool:output', 'urn:my_tool:output', 'urn:my-tool:output'].map($id => {
        try {
            return new AjvJsonSchemaValidator().getValidator({ $id, type: 'object' })({}).valid;
        } catch {
            return false;
        }
    });
} finally {
    await client.close();
    await server.close();
}
writeFileSync(process.argv[3], JSON.stringify({ seen, trace }, null, 2) + '\n');
