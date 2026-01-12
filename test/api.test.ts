import { createDatabase } from '../src/db/database';
import { createApp } from '../src/api/app';

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

describe('Usage API', () => {
  it('records usage and enforces idempotency', async () => {
    const { db, server, baseUrl } = createServer();

    try {
      const payload = {
        customerId: 123,
        service: 'Database Hosting',
        unitsConsumed: 58,
        pricePerUnit: 0.05,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'test-key-1',
      };

      const firstResponse = await fetch(`${baseUrl}/usage`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      expect(firstResponse.status).toBe(201);
      const firstBody = await firstResponse.json();
      expect(firstBody.idempotentReplay).toBe(false);

      const initialCount = db.prepare('SELECT COUNT(*) as count FROM usage_records').get() as {
        count: number;
      };
      expect(initialCount.count).toBe(1);

      const replayResponse = await fetch(`${baseUrl}/usage`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      expect(replayResponse.status).toBe(200);
      const replayBody = await replayResponse.json();
      expect(replayBody.idempotentReplay).toBe(true);
      expect(replayBody.usageRecord.id).toBe(firstBody.usageRecord.id);

      const replayCount = db.prepare('SELECT COUNT(*) as count FROM usage_records').get() as {
        count: number;
      };
      expect(replayCount.count).toBe(1);

      const conflictResponse = await fetch(`${baseUrl}/usage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          unitsConsumed: 99,
        }),
      });

      expect(conflictResponse.status).toBe(409);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});
