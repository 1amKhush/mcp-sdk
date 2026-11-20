import { describe, expect, it } from 'vitest';
import { InMemoryTaskStore } from '../../../../src/experimental/tasks/stores/in-memory.js';

describe('in-memory task session isolation', () => {
    it('hides tasks and results from other named sessions', async () => {
        const store = new InMemoryTaskStore();
        try {
            const task = await store.createTask({ ttl: 60000 }, 1, { method: 'tools/call' }, 'owner');
            for (const session of ['other']) {
                expect(await store.getTask(task.taskId, session)).toBeNull();
                expect((await store.listTasks(undefined, session)).tasks).toEqual([]);
                await expect(store.getTaskResult(task.taskId, session)).rejects.toThrow(/not found/);
                await expect(store.updateTaskStatus(task.taskId, 'cancelled', undefined, session)).rejects.toThrow(/not found/);
                await expect(store.storeTaskResult(task.taskId, 'completed', { secret: 'test' }, session)).rejects.toThrow(/not found/);
            }
            await store.storeTaskResult(task.taskId, 'completed', { secret: 'test' }, 'owner');
            expect(await store.getTaskResult(task.taskId, 'owner')).toEqual({ secret: 'test' });
            expect((await store.listTasks(undefined, 'owner')).tasks).toHaveLength(1);
            await expect(store.getTaskResult(task.taskId, 'other')).rejects.toThrow(/not found/);
        } finally {
            store.cleanup();
        }
    });

    it('keeps sessionless tasks accessible for local transports', async () => {
        const store = new InMemoryTaskStore();
        try {
            const task = await store.createTask({ ttl: 60000 }, 1, { method: 'tools/call' });
            expect(await store.getTask(task.taskId)).toMatchObject({ taskId: task.taskId });
            expect(await store.getTask(task.taskId, 'other')).toMatchObject({ taskId: task.taskId });
        } finally {
            store.cleanup();
        }
    });
});
