import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const {
    compilerOptions: { paths }
} = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'));
export default defineConfig({
    resolve: {
        alias: Object.entries(paths).map(([find, paths]) => ({
            find: new RegExp(`^${find.replaceAll('.', '\\.').replaceAll('/', '\\/')}$`),
            replacement: resolve((paths as string[])[0])
        }))
    },
    test: { globals: true, include: ['packages/*/test/**/*.test.ts'], exclude: ['**/dist/**'], testTimeout: 15000 }
});
