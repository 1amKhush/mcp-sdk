import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packedProject } from './packed-project.mjs';

// Compare the earlier upstream release with the actual fork tarball. Optional
// upstream HTTP dependencies exist only in this temporary reference project.
const project = packedProject({
    'mcp-v23-client': 'npm:@modelcontextprotocol/client@2.3.1',
    'mcp-v23-server': 'npm:@modelcontextprotocol/server@2.3.1'
});
try {
    copyFileSync('test/acceptance/upgrade-scenario.mjs', join(project.directory, 'upgrade.mjs'));
    mkdirSync('results/upgrade', { recursive: true });
    const observations = {};
    for (const version of ['v2.3.1', 'candidate']) {
        const output = join(project.directory, 'upgrade.json');
        execFileSync(process.execPath, ['upgrade.mjs', version, output], { cwd: project.directory, stdio: 'pipe' });
        observations[version] = JSON.parse(readFileSync(output, 'utf8'));
        copyFileSync(output, `results/upgrade/${version}.json`);
    }
    const before = observations['v2.3.1'].seen;
    const after = observations.candidate.seen;
    assert.equal(before.protocolVersion, '2025-11-25');
    assert.equal(after.protocolVersion, before.protocolVersion);
    assert.deepEqual(before.named, { result: { id: 'n1' } });
    assert.deepEqual(after.named, { id: 'n1' });
    assert.deepEqual(before.union, { result: { id: 'n1' } });
    assert.deepEqual(after.union, { id: 'n1' });
    assert.deepEqual(before.text, { result: 'x' });
    assert.deepEqual(after.text, before.text);
    assert.equal(after.namedSchema.type, 'object');
    assert.equal(after.namedSchema.$ref, '#/$defs/Note');
    assert.equal(before.resourceTitle, 'Old title');
    assert.equal(after.resourceTitle, 'New title');
    assert.deepEqual(before.schemaUris, [true, true, true]);
    assert.deepEqual(after.schemaUris, [false, false, true]);
    console.log('v2.3.1/candidate output-schema, resource-title, and URI-validation comparison passes; captures: results/upgrade/');
} finally {
    project.cleanup();
}
