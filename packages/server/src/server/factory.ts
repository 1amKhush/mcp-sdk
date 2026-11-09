import type { McpServer } from './mcp';
import type { Server } from './server';

export type McpServerFactory = (context: { era: 'legacy' | 'modern' }) => McpServer | Server | Promise<McpServer | Server>;
