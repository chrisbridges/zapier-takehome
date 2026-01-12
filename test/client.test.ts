import { createUsageClient, NotFoundError } from '../src/lib';

test('retries on 5xx and reuses the idempotency key', async () => {
  const calls: Array<{ url: string; options: RequestInit }> = [];
  const fetchStub = async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, options: options ?? {} });
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

  expect(result.usageRecord.id).toBe(101);
  expect(calls).toHaveLength(2);

  const firstKey = (calls[0].options.headers as Record<string, string>)['Idempotency-Key'];
  const secondKey = (calls[1].options.headers as Record<string, string>)['Idempotency-Key'];
  expect(firstKey).toBeTruthy();
  expect(firstKey).toBe(secondKey);
});

test('maps 404 responses to NotFoundError', async () => {
  const fetchStub = async (_input: RequestInfo | URL, _options?: RequestInit): Promise<Response> => {
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

  await expect(
    client.recordUsage({
      customerId: 999,
      service: 'Missing',
      unitsConsumed: 1,
      pricePerUnit: 0.01,
    })
  ).rejects.toBeInstanceOf(NotFoundError);

  await expect(
    client.recordUsage({
      customerId: 999,
      service: 'Missing',
      unitsConsumed: 1,
      pricePerUnit: 0.01,
    })
  ).rejects.toMatchObject({ status: 404 });
});
