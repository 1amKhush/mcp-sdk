import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { packedProject, workspaceRoot } from './packed-project.mjs';

const revision = '3949fe3b8513a93f2f99edc05e811b131ed84967';
const sourceRepository = process.env.CVM_SDK_REPOSITORY ?? 'https://github.com/ContextVM/sdk.git';
const bun = process.env.BUN_BIN ?? 'bun';
const directory = mkdtempSync(join(tmpdir(), 'cvm-mcp-consumer-'));
let project;
const results = join(workspaceRoot, 'results/cvm');
mkdirSync(results, { recursive: true });
try {
    project = packedProject();
    execFileSync('git', ['init', '--quiet', directory]);
    execFileSync('git', ['-C', directory, 'fetch', '--quiet', '--no-tags', '--depth=1', sourceRepository, revision], { stdio: 'pipe' });
    execFileSync('git', ['-C', directory, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    assert.equal(execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), revision);
    if (process.env.CVM_SDK_NODE_MODULES) {
        execFileSync('cp', ['-a', '--reflink=auto', process.env.CVM_SDK_NODE_MODULES, join(directory, 'node_modules')]);
    } else {
        execFileSync(bun, ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: directory, stdio: 'pipe' });
    }
    const sdkPackage = join(directory, 'node_modules/@contextvm/mcp-sdk');
    assert.equal(JSON.parse(readFileSync(join(sdkPackage, 'package.json'), 'utf8')).version, '1.30.0');
    const summaries = {};
    for (const version of ['v1', 'v2']) {
        if (version === 'v2') {
            execFileSync('git', ['apply', join(workspaceRoot, 'test/acceptance/cvm-v2.patch')], { cwd: directory, stdio: 'pipe' });
            rmSync(sdkPackage, { recursive: true, force: true });
            mkdirSync(sdkPackage, { recursive: true });
            execFileSync('tar', ['-xzf', project.tarball, '-C', sdkPackage, '--strip-components=1']);
            assert.equal(JSON.parse(readFileSync(join(sdkPackage, 'package.json'), 'utf8')).version, '2.3.1');
        }
        const types = spawnSync(process.execPath, [join(directory, 'node_modules/typescript/bin/tsc'), '--noEmit', '--pretty', 'false'], {
            cwd: directory,
            encoding: 'utf8',
            timeout: 120000
        });
        writeFileSync(join(results, `${version}-types.log`), (types.stdout ?? '') + (types.stderr ?? ''));
        assert.equal(types.status, 0, `${version} typecheck failed; see results/cvm/${version}-types.log`);
        const run = spawnSync(
            bun,
            ['test', '--concurrent', '--timeout=60000', 'src/transport', 'src/gateway', 'src/proxy', 'src/payments'],
            {
                cwd: directory,
                encoding: 'utf8',
                timeout: 300000,
                maxBuffer: 64 * 1024 * 1024,
                env: {
                    ...process.env,
                    PATH: process.env.BUN_BIN ? `${dirname(resolve(bun))}:${process.env.PATH ?? ''}` : process.env.PATH,
                    LOG_LEVEL: 'silent',
                    NWC_INTEGRATION: 'false',
                    LNBITS_INTEGRATION: 'false',
                    ZAP_INTEGRATION: 'false'
                }
            }
        );
        const output = (run.stdout ?? '') + (run.stderr ?? '');
        writeFileSync(join(results, `${version}.log`), output);
        const pass = Number(output.match(/\n\s*(\d+) pass\n/)?.[1]);
        const fail = Number(output.match(/\n\s*(\d+) fail\n/)?.[1]);
        const skip = Number(output.match(/\n\s*(\d+) skip\n/)?.[1] ?? 0);
        summaries[version] = { pass, fail, skip, exitCode: run.status };
        assert(!run.error, `${version}: ${run.error?.message}`);
        assert.equal(run.status, 0, `${version} failed; see results/cvm/${version}.log`);
        assert(pass > 500 && fail === 0, `Incomplete ${version} acceptance run`);
        console.log(`${version} pinned CVM: ${pass} pass, ${skip} skip, ${fail} fail`);
    }
    assert.deepEqual(summaries.v1, summaries.v2);
    writeFileSync(
        join(results, 'summary.json'),
        JSON.stringify({ revision, bun: execFileSync(bun, ['--version'], { encoding: 'utf8' }).trim(), summaries }, null, 2) + '\n'
    );
} finally {
    project?.cleanup();
    if (!process.env.KEEP_CVM_FIXTURE) rmSync(directory, { recursive: true, force: true });
    else console.log(`CVM fixture retained: ${directory}`);
}
