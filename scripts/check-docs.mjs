import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const name of ['README.md', 'docs/migration.md', 'docs/protocol-versions.md', 'docs/fork-baseline.md', 'docs/cvm-sdk-upgrade.md']) {
    const text = readFileSync(name, 'utf8');
    assert.equal((text.match(/^```/gm) ?? []).length % 2, 0, `Unclosed code block: ${name}`);
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
        if (target.startsWith('https:') || target.startsWith('#')) continue;
        readFileSync(new URL(target.split('#')[0], new URL(`../${name}`, import.meta.url)));
    }
}
console.log('Documentation links and code fences pass');
