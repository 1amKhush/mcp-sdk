import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** Installs the real tarball outside the workspace; callers own cleanup. */
export function packedProject(extraDependencies = {}) {
    const directory = mkdtempSync(join(tmpdir(), 'cvm-mcp-package-'));
    try {
        execFileSync('pnpm', ['--dir', 'packages/sdk', 'pack', '--pack-destination', directory], {
            stdio: 'pipe',
            env: { ...process.env, npm_config_ignore_scripts: 'true' }
        });
        const tarball = join(
            directory,
            readdirSync(directory).find(name => name.endsWith('.tgz'))
        );
        writeFileSync(
            join(directory, 'package.json'),
            JSON.stringify({
                private: true,
                type: 'module',
                dependencies: { '@contextvm/mcp-sdk': `file:${tarball}`, ...extraDependencies }
            })
        );
        execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: directory, stdio: 'pipe' });
        return { directory, tarball, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
    } catch (error) {
        rmSync(directory, { recursive: true, force: true });
        throw error;
    }
}

export const workspaceRoot = resolve(new URL('..', import.meta.url).pathname);
