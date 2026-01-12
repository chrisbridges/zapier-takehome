import type { Server } from 'node:http';
import { createDatabase } from '../src/db/database';
import { createApp } from '../src/api/app';

describe('Usage API', () => {
  it('records usage successfully', async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postUsage(baseUrl, createPayload());
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.idempotentReplay).toBe(false);
      expect(body.usageRecord.customerId).toBe(123);
    });
  });

  it('replays an idempotent request', async () => {
    await withServer(async ({ baseUrl, db }) => {
      const payload = createPayload();
      const firstResponse = await postUsage(baseUrl, payload);
      expect(firstResponse.status).toBe(201);
      const firstBody = await firstResponse.json();

      const replayResponse = await postUsage(baseUrl, payload);
      expect(replayResponse.status).toBe(200);
      const replayBody = await replayResponse.json();
      expect(replayBody.idempotentReplay).toBe(true);
      expect(replayBody.usageRecord.id).toBe(firstBody.usageRecord.id);

      const row = db.prepare('SELECT COUNT(*) as count FROM usage_records').get() as {
        count: number;
      };
      expect(row.count).toBe(1);
    });
  });

  it('rejects idempotency key reuse with different payload', async () => {
    await withServer(async ({ baseUrl }) => {
      const payload = createPayload();
      const firstResponse = await postUsage(baseUrl, payload);
      expect(firstResponse.status).toBe(201);

      const conflictResponse = await postUsage(baseUrl, {
        ...payload,
        unitsConsumed: 99,
      });
      expect(conflictResponse.status).toBe(409);
    });
  });

  it('requires the Idempotency-Key header', async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postUsage(baseUrl, createPayload(), { 'Idempotency-Key': '' });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('validation_error');
    });
  });

  it('rejects non-object JSON bodies', async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postUsage(baseUrl, []);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('validation_error');
    });
  });

  it('returns validation details for invalid fields', async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postUsage(baseUrl, createPayload({ customerId: 'oops', service: '' }));
      expect(response.status).toBe(400);
      const body = await response.json();
      const fields = (body.details as Array<{ field: string }>).map((detail) => detail.field);
      expect(fields).toEqual(expect.arrayContaining(['customerId', 'service']));
    });
  });

  it('returns 404 for unknown customers', async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postUsage(baseUrl, createPayload({ customerId: 999 }));
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.code).toBe('not_found');
    });
  });

  it('returns 400 for invalid JSON', async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'test-key-1',
        },
        body: '{',
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('invalid_json');
    });
  });

  it('returns 500 for unexpected errors', async () => {
    await withServer(async ({ baseUrl, db }) => {
      db.close();
      const response = await postUsage(baseUrl, createPayload());
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.code).toBe('server_error');
    });
  });
});

const createServer = () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db });
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start test server');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { db, server, baseUrl };
};

// utils
const closeServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const safeCloseDb = (db: ReturnType<typeof createDatabase>) => {
  try {
    db.close();
  } catch {
    // ignore double-close in tests
  }
};

const withServer = async (
  handler: (context: ReturnType<typeof createServer>) => Promise<void>
) => {
  const context = createServer();
  try {
    await handler(context);
  } finally {
    await closeServer(context.server);
    safeCloseDb(context.db);
  }
};

const createPayload = (overrides: Record<string, unknown> = {}) => ({
  customerId: 123,
  service: 'Database Hosting',
  unitsConsumed: 58,
  pricePerUnit: 0.05,
  ...overrides,
});

const postUsage = (baseUrl: string, payload: unknown, headers?: Record<string, string>) =>
  fetch(`${baseUrl}/usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'test-key-1',
      ...headers,
    },
    body: JSON.stringify(payload),
  });
