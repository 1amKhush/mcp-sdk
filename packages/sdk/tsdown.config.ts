import { defineConfig } from 'tsdown';
import { readdirSync } from 'node:fs';

export default defineConfig({
    failOnWarn: true,
    entry: Object.fromEntries(
        readdirSync('src')
            .filter(name => name.endsWith('.ts'))
            .map(name => [name.slice(0, -3), `src/${name}`])
    ),
    format: ['esm', 'cjs'],
    fixedExtension: true,
    outDir: 'dist',
    clean: true,
    target: 'node20',
    platform: 'neutral',
    shims: false,
    inputOptions: { resolve: { mainFields: ['module', 'main'] } },
    sourcemap: true,
    noExternal: [/^@modelcontextprotocol\//, /^ajv/, /^@cfworker\//, 'json-schema-typed'],
    external: ['@contextvm/mcp-sdk/_shims', 'cross-spawn', 'zod', /^node:/],
    tsconfig: '../../tsconfig.json',
    dts: { resolver: 'tsc' }
});
