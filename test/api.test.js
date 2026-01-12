'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/db/database');
const { createApp } = require('../src/api/app');

const createServer = () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db });
  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { db, server, baseUrl };
};

test('records usage and enforces idempotency', async (t) => {
  const { db, server, baseUrl } = createServer();
  t.after(() => server.close());

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

  assert.equal(firstResponse.status, 201);
  const firstBody = await firstResponse.json();
  assert.equal(firstBody.idempotentReplay, false);

  const initialCount = db.prepare('SELECT COUNT(*) as count FROM usage_records').get().count;
  assert.equal(initialCount, 1);

  const replayResponse = await fetch(`${baseUrl}/usage`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  assert.equal(replayResponse.status, 200);
  const replayBody = await replayResponse.json();
  assert.equal(replayBody.idempotentReplay, true);
  assert.equal(replayBody.usageRecord.id, firstBody.usageRecord.id);

  const replayCount = db.prepare('SELECT COUNT(*) as count FROM usage_records').get().count;
  assert.equal(replayCount, 1);

  const conflictResponse = await fetch(`${baseUrl}/usage`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      unitsConsumed: 99,
    }),
  });

  assert.equal(conflictResponse.status, 409);
});
