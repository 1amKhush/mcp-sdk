import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as core from '../src/index';
import { CursorSchema, InitializeRequestSchema } from '../src/index';

function readCore(relativePath: string): string {
    return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

function exportedSchemaConsts(src: string, re: RegExp): string[] {
    return [...src.matchAll(re)].map(m => m[1]).filter((name): name is string => name !== undefined && /^[A-Z]/.test(name));
}

describe('@modelcontextprotocol/core', () => {
    it('re-exports spec schemas as working Zod objects', () => {
        // Round-trips valid/invalid values — proves the re-exports are real Zod schemas (not type-only
        // aliases) and that `.parse`/`.safeParse` work, for both the spec and the OAuth group.
        expect(CursorSchema.parse('abc')).toBe('abc');
        expect(InitializeRequestSchema.safeParse({}).success).toBe(false);
    });

    it('re-exports exactly core’s spec schemas — no internal helpers (drift guard)', () => {
        const SPEC_INTERNAL_HELPERS = [
            'BaseRequestParamsSchema',
            'ClientTasksCapabilitySchema',
            'ListChangedOptionsBaseSchema',
            'NotificationsParamsSchema',
            'ServerTasksCapabilitySchema'
        ];
        const specSchemas = exportedSchemaConsts(readCore('../src/schemas.ts'), /^export const (\w+Schema)\b/gm).filter(
            name => !SPEC_INTERNAL_HELPERS.includes(name)
        );
        const expected = [...specSchemas].sort();
        const exported = Object.keys(core).sort();
        // Exact match, both directions: a new core spec/auth schema missing here fails (we forgot to
        // re-export it), and any internal helper / non-spec symbol that leaks here also fails.
        expect(exported).toEqual(expected);
        expect(specSchemas.length).toBeGreaterThanOrEqual(154);
    });
});
