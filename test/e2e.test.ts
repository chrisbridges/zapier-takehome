import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { createApp } from '../src/api/app';
import { createDatabase } from '../src/db/database';
import { createUsageClient, NotFoundError, ValidationError } from '../src/lib';

describe('Usage API e2e', () => {
  it('records usage and replays idempotent requests', async () => {
    await withServer(async ({ baseUrl }) => {
      const client = createUsageClient({ baseUrl });
      const first = await client.recordUsage(createParams(), { idempotencyKey: 'e2e-key' });
      const replay = await client.recordUsage(createParams(), { idempotencyKey: 'e2e-key' });

      expect(first.idempotentReplay).toBe(false);
      expect(replay.idempotentReplay).toBe(true);
      expect(replay.usageRecord.id).toBe(first.usageRecord.id);
    });
  });

  it('surfaces validation errors from the API', async () => {
    await withServer(async ({ baseUrl }) => {
      const client = createUsageClient({ baseUrl });
      const badParams = createParams({ unitsConsumed: -1 }) as unknown as Parameters<
        typeof client.recordUsage
      >[0];

      await expect(client.recordUsage(badParams)).rejects.toBeInstanceOf(ValidationError);
    });
  });

  it('surfaces not found errors for unknown customers', async () => {
    await withServer(async ({ baseUrl }) => {
      const client = createUsageClient({ baseUrl });

      await expect(
        client.recordUsage(createParams({ customerId: 999 }))
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

type E2eServer = {
  baseUrl: string;
  server: Server;
  db: ReturnType<typeof createDatabase>;
  tempDir: string;
};

const startServer = async (): Promise<E2eServer> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'usage-e2e-'));
  const dbPath = path.join(tempDir, 'usage.sqlite');
  const db = createDatabase(dbPath);
  const app = createApp({ db });
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start test server');
  }
  return { baseUrl: `http://127.0.0.1:${address.port}`, server, db, tempDir };
};

const stopServer = async ({ server, db, tempDir }: E2eServer) => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  db.close();
  await fs.rm(tempDir, { recursive: true, force: true });
};

const withServer = async (handler: (server: E2eServer) => Promise<void>) => {
  const server = await startServer();
  try {
    await handler(server);
  } finally {
    await stopServer(server);
  }
};

const createParams = (overrides: Record<string, number | string> = {}) => ({
  customerId: 123,
  service: 'Database Hosting',
  unitsConsumed: 1,
  pricePerUnit: 0.05,
  ...overrides,
});