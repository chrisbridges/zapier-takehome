import {
  ConflictError,
  createUsageClient,
  NetworkError,
  NotFoundError,
  ServerError,
  ValidationError,
} from '../src/lib';

test('retries on 5xx and reuses the idempotency key', async () => {
  const { calls, fetchStub } = createQueueFetch([
    jsonResponse(500, { code: 'server_error', message: 'boom' }),
    jsonResponse(201, { usageRecord: { id: 101 }, idempotentReplay: false }),
  ]);

  const client = createClient(fetchStub, { maxRetries: 1 });

  const result = await client.recordUsage(createParams());

  expect(result.usageRecord.id).toBe(101);
  expect(calls).toHaveLength(2);

  const firstKey = (calls[0].options.headers as Record<string, string>)['Idempotency-Key'];
  const secondKey = (calls[1].options.headers as Record<string, string>)['Idempotency-Key'];
  expect(firstKey).toBeTruthy();
  expect(firstKey).toBe(secondKey);
});

test('uses a provided idempotency key', async () => {
  const { calls, fetchStub } = createQueueFetch([
    jsonResponse(201, { usageRecord: { id: 201 }, idempotentReplay: false }),
  ]);
  const client = createClient(fetchStub);

  await client.recordUsage(createParams(), { idempotencyKey: 'fixed-key' });

  const key = (calls[0].options.headers as Record<string, string>)['Idempotency-Key'];
  expect(key).toBe('fixed-key');
});

test('maps 404 responses to NotFoundError', async () => {
  const { fetchStub } = createQueueFetch([
    jsonResponse(404, { code: 'not_found', message: 'missing' }),
  ]);
  const client = createClient(fetchStub);

  const error = await client.recordUsage(createParams({ customerId: 999 })).catch((err) => err);
  expect(error).toBeInstanceOf(NotFoundError);
  expect(error).toMatchObject({ status: 404 });
});

test('maps 400 responses to ValidationError with details', async () => {
  const details = [{ field: 'service', message: 'required' }];
  const { fetchStub } = createQueueFetch([
    jsonResponse(400, { code: 'validation_error', message: 'bad', details }),
  ]);
  const client = createClient(fetchStub);

  const error = await client.recordUsage(createParams()).catch((err) => err);
  expect(error).toBeInstanceOf(ValidationError);
  expect(error).toMatchObject({ status: 400, details });
});

test('maps 409 responses to ConflictError', async () => {
  const { fetchStub } = createQueueFetch([
    jsonResponse(409, { code: 'conflict', message: 'reused' }),
  ]);
  const client = createClient(fetchStub);

  await expect(client.recordUsage(createParams())).rejects.toBeInstanceOf(ConflictError);
});

test('maps 500 responses to ServerError', async () => {
  const { fetchStub } = createQueueFetch([
    jsonResponse(500, { code: 'server_error', message: 'oops' }),
  ]);
  const client = createClient(fetchStub);

  await expect(client.recordUsage(createParams())).rejects.toBeInstanceOf(ServerError);
});

test('throws NetworkError when fetch fails', async () => {
  const { fetchStub } = createQueueFetch([new Error('offline')]);
  const client = createClient(fetchStub);

  await expect(client.recordUsage(createParams())).rejects.toBeInstanceOf(NetworkError);
});

test('throws ServerError on an empty success response body', async () => {
  const { fetchStub } = createQueueFetch([new Response('', { status: 201 })]);
  const client = createClient(fetchStub);

  await expect(client.recordUsage(createParams())).rejects.toBeInstanceOf(ServerError);
});

test('throws when baseUrl is missing', () => {
  expect(() => createUsageClient({} as Parameters<typeof createUsageClient>[0])).toThrow(
    /baseUrl is required/
  );
});

// utils
const createParams = (overrides: Record<string, number | string> = {}) => ({
  customerId: 123,
  service: 'Load Balancer',
  unitsConsumed: 3,
  pricePerUnit: 0.03,
  ...overrides,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createQueueFetch = (queue: Array<Response | Error>) => {
  const calls: Array<{ url: string; options: RequestInit }> = [];
  const fetchStub = async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, options: options ?? {} });
    const next = queue.shift();
    if (!next) {
      throw new Error('Unexpected fetch call');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  };

  return { calls, fetchStub };
};

const createClient = (fetchStub: typeof fetch, overrides: Partial<Parameters<typeof createUsageClient>[0]> = {}) =>
  createUsageClient({
    baseUrl: 'http://example.test',
    fetch: fetchStub,
    maxRetries: 0,
    timeoutMs: 250,
    ...overrides,
  });