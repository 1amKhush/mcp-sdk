import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packedProject } from './packed-project.mjs';

const project = packedProject({ 'mcp-v1': 'npm:@contextvm/mcp-sdk@1.30.0' });
try {
    copyFileSync('test/acceptance/stdio-server.mjs', join(project.directory, 'server.mjs'));
    writeFileSync(
        join(project.directory, 'client.mjs'),
        `
import assert from 'node:assert/strict';
const [clientPackage, serverPackage, mode] = process.argv.slice(2);
const { Client } = await import(clientPackage + '/client');
const { StdioClientTransport } = await import(clientPackage + '/client/stdio');
const client = new Client({ name: 'stdio-client', version: '1' }, mode === 'modern' ? { versionNegotiation: { mode: 'auto' } } : {});
const transport = new StdioClientTransport({ command: process.execPath, args: ['server.mjs', serverPackage, mode], cwd: process.cwd() });
try {
 await client.connect(transport);
 const result = await client.callTool({ name: 'echo', arguments: { text: 'stdio' } });
 assert.deepEqual(result.content, [{ type: 'text', text: 'stdio' }]);
 if (mode === 'modern') assert.equal(client.getProtocolEra(), 'modern');
} finally { await client.close(); }
`
    );
    const scenarios = [
        ['mcp-v1', '@contextvm/mcp-sdk', 'legacy'],
        ['@contextvm/mcp-sdk', 'mcp-v1', 'legacy'],
        ['@contextvm/mcp-sdk', '@contextvm/mcp-sdk', 'legacy'],
        ['@contextvm/mcp-sdk', '@contextvm/mcp-sdk', 'modern']
    ];
    for (const scenario of scenarios)
        execFileSync(process.execPath, ['client.mjs', ...scenario], { cwd: project.directory, timeout: 30000, stdio: 'pipe' });
    assert.equal(scenarios.length, 4);
    console.log('Packed stdio interoperability: 4 legacy/mixed-version/modern scenarios pass');
} finally {
    project.cleanup();
}
