import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/core-internal';
import { fromJsonSchema, McpServer } from '@modelcontextprotocol/server';
import { describe, expect, it } from 'vitest';

import { AjvJsonSchemaValidator } from '../../../core-internal/src/validators/ajvProvider';
import { serverEventToNotification } from '../../src/server/serverEventBus';

describe('v2.4.0 retained behavior', () => {
    it('advertises and returns local object references without a legacy result wrapper', async () => {
        const server = new McpServer({ name: 'schema-server', version: '1' });
        const client = new Client({ name: 'schema-client', version: '1' });
        const $defs = {
            Note: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
            Text: { type: 'string' }
        };
        for (const [name, schema] of [
            ['named', { $ref: '#/$defs/Note', $defs }],
            ['union', { anyOf: [{ $ref: '#/$defs/Note' }], $defs }]
        ] as const) {
            server.registerTool(name, { outputSchema: fromJsonSchema<{ id: string }>(schema) }, async () => ({
                content: [],
                structuredContent: { id: 'n1' }
            }));
        }
        server.registerTool('text', { outputSchema: fromJsonSchema<string>({ $ref: '#/$defs/Text', $defs }) }, async () => ({
            content: [],
            structuredContent: 'x'
        }));
        const [a, b] = InMemoryTransport.createLinkedPair();
        try {
            await server.connect(b);
            await client.connect(a);
            const { tools } = await client.listTools();
            expect(tools.find(tool => tool.name === 'named')?.outputSchema).toMatchObject({ type: 'object', $ref: '#/$defs/Note' });
            for (const name of ['named', 'union']) {
                expect((await client.callTool({ name })).structuredContent).toEqual({ id: 'n1' });
            }
            expect((await client.callTool({ name: 'text' })).structuredContent).toEqual({ result: 'x' });
        } finally {
            await client.close();
            await server.close();
        }
    });

    it.each(['tools_list_changed', 'prompts_list_changed', 'resources_list_changed'] as const)(
        'preserves forwarded metadata on %s events',
        kind => {
            const params = { _meta: { 'contextvm/provenance': 'upstream' }, extension: { revision: 7 } };
            expect(serverEventToNotification({ kind, params }).params).toEqual(params);
        }
    );

    it('keeps forwarded resource metadata while using the event resource URI', () => {
        const params = { uri: 'docs://old', _meta: { 'contextvm/provenance': 'upstream' }, extension: true };
        expect(serverEventToNotification({ kind: 'resource_updated', uri: 'docs://current', params }).params).toEqual({
            ...params,
            uri: 'docs://current'
        });
        expect(params.uri).toBe('docs://old');
    });

    it.each(['my_tool:output', 'urn:my_tool:output'])('rejects the invalid schema URI %s', $id => {
        expect(() => new AjvJsonSchemaValidator().getValidator({ $id, type: 'object' })).toThrow();
    });

    it('accepts valid URN identifiers and local references', () => {
        const validate = new AjvJsonSchemaValidator().getValidator({
            $id: 'urn:my-tool:output',
            $ref: '#/$defs/Note',
            $defs: { Note: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } }
        });
        expect(validate({ id: 'n1' }).valid).toBe(true);
        expect(validate({ id: 1 }).valid).toBe(false);
    });
});
