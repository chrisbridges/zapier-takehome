'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createUsageClient, NotFoundError } = require('../src/lib');

test('retries on 5xx and reuses the idempotency key', async () => {
  const calls = [];
  const fetchStub = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) {
      return new Response(JSON.stringify({ code: 'server_error', message: 'boom' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        usageRecord: { id: 101 },
        idempotentReplay: false,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const client = createUsageClient({
    baseUrl: 'http://example.test',
    fetch: fetchStub,
    maxRetries: 1,
    timeoutMs: 250,
  });

  const result = await client.recordUsage({
    customerId: 123,
    service: 'Load Balancer',
    unitsConsumed: 3,
    pricePerUnit: 0.03,
  });

  assert.equal(result.usageRecord.id, 101);
  assert.equal(calls.length, 2);

  const firstKey = calls[0].options.headers['Idempotency-Key'];
  const secondKey = calls[1].options.headers['Idempotency-Key'];
  assert.ok(firstKey);
  assert.equal(firstKey, secondKey);
});

test('maps 404 responses to NotFoundError', async () => {
  const fetchStub = async () => {
    return new Response(JSON.stringify({ code: 'not_found', message: 'missing' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = createUsageClient({
    baseUrl: 'http://example.test',
    fetch: fetchStub,
    maxRetries: 0,
  });

  await assert.rejects(
    () =>
      client.recordUsage({
        customerId: 999,
        service: 'Missing',
        unitsConsumed: 1,
        pricePerUnit: 0.01,
      }),
    (error) => error instanceof NotFoundError && error.status === 404
  );
});
