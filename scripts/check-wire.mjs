import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packedProject } from './packed-project.mjs';

const project = packedProject({ 'mcp-v1': 'npm:@contextvm/mcp-sdk@1.30.0' });
try {
    copyFileSync('test/acceptance/wire-scenario.mjs', join(project.directory, 'scenario.mjs'));
    const observations = {};
    mkdirSync('results/wire', { recursive: true });
    for (const name of ['mcp-v1', '@contextvm/mcp-sdk']) {
        const output = join(project.directory, 'observations.json');
        execFileSync(process.execPath, ['scenario.mjs', name, output], { cwd: project.directory, stdio: 'pipe' });
        observations[name] = JSON.parse(readFileSync(output, 'utf8'));
        copyFileSync(output, `results/wire/${name === 'mcp-v1' ? 'v1' : 'v2'}.json`);
    }
    assert.deepEqual(observations['mcp-v1'].trace.slice(0, 5), observations['@contextvm/mcp-sdk'].trace.slice(0, 5));
    const v1 = observations['mcp-v1'].seen;
    const v2 = observations['@contextvm/mcp-sdk'].seen;
    assert.equal(v1.protocolVersion, v2.protocolVersion);
    assert.deepEqual(v1.echo, v2.echo);
    assert.deepEqual(v1.meta, v2.meta);
    assert.equal(v1.list.tools.length, 1);
    assert.equal(v2.list.tools.length, 2);
    assert.deepEqual(v1.page, v2.page);
    assert(v1.unknown.isError);
    assert.equal(v2.unknown.code, -32602);
    assert.equal(v1.paymentError.id, v2.paymentError.id);
    assert.equal(v1.paymentError.error.code, v2.paymentError.error.code);
    assert.deepEqual(v1.paymentError.error.data, v2.paymentError.error.data);
    assert.equal(v1.paymentError.error.message, 'MCP error -32043: payment rejected');
    assert.equal(v2.paymentError.error.message, 'payment rejected');
    assert.deepEqual(v1.malformed, v2.malformed);
    assert.equal(v2.malformed.replies.length, 0);
    assert(v1.invalidArguments.isError);
    assert(v2.invalidArguments.isError);
    console.log('v1/v2 wire comparison passes; captures: results/wire/{v1,v2}.json');
} finally {
    project.cleanup();
}
