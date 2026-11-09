import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';
import { build } from 'esbuild';
import ts from 'typescript';
import { packedProject, workspaceRoot } from './packed-project.mjs';

const project = packedProject();
try {
    const { directory } = project;
    const packageDirectory = join(directory, 'node_modules/@contextvm/mcp-sdk');
    const manifest = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.dependencies).sort(), ['cross-spawn', 'zod']);
    for (const key of Object.keys(manifest.exports)) {
        assert(!/http|sse|websocket|oauth|experimental/i.test(key), `Unexpected export ${key}`);
    }
    const specifiers = Object.keys(manifest.exports)
        .filter(key => key !== './package.json' && key !== './_shims')
        .map(key => '@contextvm/mcp-sdk' + (key === '.' ? '' : key.slice(1)));
    writeFileSync(
        join(directory, 'exports.mjs'),
        `import assert from 'node:assert/strict';\nfor (const path of ${JSON.stringify(specifiers)}) { const entry = await import(path); assert(entry); }\nconst { Client, McpServer, InMemoryTransport } = await import('@contextvm/mcp-sdk');\nconst [a,b] = InMemoryTransport.createLinkedPair(); const server = new McpServer({name:'smoke', version:'1'}); const client = new Client({name:'smoke', version:'1'}); await server.connect(b); await client.connect(a); await client.ping(); await client.close(); await server.close();\n`
    );
    execFileSync(process.execPath, ['exports.mjs'], { cwd: directory, stdio: 'pipe' });
    const require = createRequire(join(directory, 'package.json'));
    for (const specifier of specifiers) assert(require(specifier));
    const browser = await build({
        stdin: {
            contents:
                "import { Client } from '@contextvm/mcp-sdk/client'; import { McpServer } from '@contextvm/mcp-sdk/server'; import { InMemoryTransport } from '@contextvm/mcp-sdk/inMemory'; globalThis.smoke = (async () => { const [a,b] = InMemoryTransport.createLinkedPair(); const server = new McpServer({name:'browser',version:'1'}); const client = new Client({name:'browser',version:'1'}); await server.connect(b); await client.connect(a); await client.ping(); await client.close(); await server.close(); })();",
            resolveDir: directory
        },
        bundle: true,
        platform: 'browser',
        format: 'iife',
        write: false,
        metafile: true
    });
    assert(!Object.keys(browser.metafile.inputs).some(path => /cross-spawn|child_process|client-stdio|server-stdio|shims-node/.test(path)));
    const browserRealm = Object.fromEntries(
        [
            'TextEncoder',
            'TextDecoder',
            'URL',
            'URLSearchParams',
            'AbortController',
            'AbortSignal',
            'Headers',
            'Request',
            'Response',
            'crypto',
            'console',
            'setTimeout',
            'clearTimeout',
            'setInterval',
            'clearInterval',
            'queueMicrotask',
            'fetch',
            'atob',
            'btoa'
        ].map(name => [name, globalThis[name]])
    );
    runInNewContext(browser.outputFiles[0].text, browserRealm);
    await browserRealm.smoke;
    const fixture = join(directory, 'types.mts');
    writeFileSync(
        fixture,
        "import { Client, McpServer, type Transport } from '@contextvm/mcp-sdk'; import { StdioClientTransport } from '@contextvm/mcp-sdk/client/stdio.js'; import { InitializeResultSchema, type JSONRPCMessage } from '@contextvm/mcp-sdk/types.js'; const c = new Client({ name: 'c', version: '1' }); const s = new McpServer({ name: 's', version: '1' }); let t: Transport; let m: JSONRPCMessage; void [c,s,StdioClientTransport,InitializeResultSchema];\n"
    );
    const cjsFixture = join(directory, 'types.cts');
    writeFileSync(cjsFixture, readFileSync(fixture));
    execFileSync(
        process.execPath,
        [
            join(workspaceRoot, 'node_modules/typescript/bin/tsc'),
            '--noEmit',
            '--module',
            'NodeNext',
            '--moduleResolution',
            'NodeNext',
            '--target',
            'ES2022',
            '--skipLibCheck',
            '--typeRoots',
            join(workspaceRoot, 'node_modules/@types'),
            fixture,
            cjsFixture
        ],
        { cwd: directory, stdio: 'pipe' }
    );
    const forbidden = [
        'eventsource',
        'eventsource-parser',
        'jose',
        'pkce-challenge',
        'express',
        'hono',
        'fastify',
        '@modelcontextprotocol/'
    ];
    for (const file of readdirSync(join(packageDirectory, 'dist')).filter(name => /\.(mjs|cjs|mts|cts)$/.test(name))) {
        const source = readFileSync(join(packageDirectory, 'dist', file), 'utf8');
        const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
        const imports = [];
        function visit(node) {
            if (
                (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
                node.moduleSpecifier &&
                ts.isStringLiteral(node.moduleSpecifier)
            )
                imports.push(node.moduleSpecifier.text);
            if (
                ts.isCallExpression(node) &&
                (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(ast) === 'require') &&
                node.arguments[0] &&
                ts.isStringLiteral(node.arguments[0])
            )
                imports.push(node.arguments[0].text);
            ts.forEachChild(node, visit);
        }
        visit(ast);
        for (const specifier of imports)
            assert(!forbidden.some(name => specifier.startsWith(name)), `Forbidden dependency ${specifier} in ${file}`);
    }
    console.log(`Packed artifact: ${specifiers.length} ESM/CJS exports, declarations, browser isolation, and dependency checks pass`);
} finally {
    project.cleanup();
}
