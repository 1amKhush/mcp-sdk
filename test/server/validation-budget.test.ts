import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Client } from '../../src/client/index.js';
import { InMemoryTransport } from '../../src/inMemory.js';
import { McpServer } from '../../src/server/mcp.js';

describe('tool input validation budget', () => {
    it('bounds concurrent async validations and releases capacity afterward', async () => {
        let release!: () => void;
        const gate = new Promise<void>(resolve => {
            release = resolve;
        });
        const validate = vi.fn(async () => gate);
        const server = new McpServer({ name: 'budget', version: '1' });
        server.registerTool('test', { inputSchema: { item: z.string().superRefine(validate) } }, () => ({ content: [] }));
        const client = new Client({ name: 'test', version: '1' });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        const pending = Array.from({ length: 5 }, () => client.callTool({ name: 'test', arguments: { item: 'ok' } }));
        try {
            await vi.waitFor(() => expect(validate).toHaveBeenCalledTimes(5));
            const rejected = await client.callTool({ name: 'test', arguments: { item: 'ok' } });
            expect(rejected.isError).toBe(true);
            expect(JSON.stringify(rejected)).toContain('concurrent');
            expect(validate).toHaveBeenCalledTimes(5);
            release();
            await Promise.all(pending);
            expect((await client.callTool({ name: 'test', arguments: { item: 'ok' } })).isError).not.toBe(true);
        } finally {
            release();
            await Promise.allSettled(pending);
            await client.close();
            await server.close();
        }
    });

    it.each([undefined, 10])('rejects oversized input before validating elements (limit %s)', async maxToolInputElements => {
        const server = new McpServer({ name: 'budget', version: '1' }, { maxToolInputElements });
        const validate = vi.fn((value: unknown) => value);
        const handler = vi.fn(() => ({ content: [] }));
        server.registerTool('test', { inputSchema: { items: z.array(z.preprocess(validate, z.string())) } }, handler);
        const client = new Client({ name: 'test', version: '1' });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        try {
            const max = maxToolInputElements ?? 1000;
            for (const items of [Array(max).fill(0), Array(max), Array(max / 2).fill({ nested: 'value' })]) {
                const result = await client.callTool({ name: 'test', arguments: { items: items } });
                expect(result.isError).toBe(true);
                expect(JSON.stringify(result)).toContain('maximum');
                expect(JSON.stringify(result).length).toBeLessThan(500);
                expect(validate).not.toHaveBeenCalled();
                expect(handler).not.toHaveBeenCalled();
            }
        } finally {
            await client.close();
            await server.close();
        }
    });

    it.each([10, Infinity])('accepts valid input within the configured limit %s', async maxToolInputElements => {
        const server = new McpServer({ name: 'budget', version: '1' }, { maxToolInputElements });
        const handler = vi.fn(() => ({ content: [] }));
        server.registerTool('test', { inputSchema: { items: z.array(z.string()) } }, handler);
        const client = new Client({ name: 'test', version: '1' });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        try {
            const result = await client.callTool({
                name: 'test',
                arguments: { items: Array(maxToolInputElements === Infinity ? 1001 : 9).fill('ok') }
            });
            expect(result.isError).not.toBe(true);
            expect(handler).toHaveBeenCalledOnce();
        } finally {
            await client.close();
            await server.close();
        }
    });

    it.each([0, -1, NaN, -Infinity])('rejects invalid limit %s', maxToolInputElements => {
        expect(() => new McpServer({ name: 'budget', version: '1' }, { maxToolInputElements })).toThrow(RangeError);
    });
});
