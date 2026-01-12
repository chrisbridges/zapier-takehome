import { randomUUID } from 'node:crypto';
import {
  ConflictError,
  NetworkError,
  NotFoundError,
  ServerError,
  UsageClientError,
  ValidationError,
  type UsageClientErrorOptions,
} from './errors';

export type RecordUsageParams = {
  customerId: number;
  service: string;
  unitsConsumed: number;
  pricePerUnit: number;
  occurredAt?: string;
};

export type UsageRecord = {
  id: number;
  customerId: number;
  service: string;
  unitsConsumed: number;
  pricePerUnit: number;
  occurredAt: string;
  billingPeriod: string;
};

export type UsageResponse = {
  usageRecord: UsageRecord;
  idempotentReplay: boolean;
};

export type RecordUsageOptions = {
  idempotencyKey?: string;
};

export type UsageClientConfig = {
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
};

function resolveFetch(customFetch?: typeof fetch): typeof fetch {
  if (customFetch) {
    return customFetch;
  }
  if (typeof fetch === 'function') {
    return fetch;
  }
  throw new Error('No fetch implementation available. Provide one in config.');
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function mapHttpError(status: number, payload: Record<string, unknown> | null): UsageClientError {
  const message =
    payload && typeof payload.message === 'string'
      ? payload.message
      : `Request failed with status ${status}`;
  const options: UsageClientErrorOptions = {
    status,
    code: typeof payload?.code === 'string' ? payload.code : undefined,
    details: payload?.details,
  };

  switch (status) {
    case 400:
      return new ValidationError(message, options);
    case 404:
      return new NotFoundError(message, options);
    case 409:
      return new ConflictError(message, options);
    default:
      return new ServerError(message, options);
  }
}

export function createUsageClient(config: UsageClientConfig) {
  if (!config?.baseUrl) {
    throw new Error('baseUrl is required');
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const timeoutMs = config.timeoutMs ?? 5000;
  const maxRetries = config.maxRetries ?? 2;
  const fetchImpl = resolveFetch(config.fetch);

  async function recordUsage(
    params: RecordUsageParams,
    options: RecordUsageOptions = {}
  ): Promise<UsageResponse> {
    const idempotencyKey = options.idempotencyKey || randomUUID();
    const url = `${baseUrl}/usage`;
    const body = JSON.stringify(params);

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let response: Response;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body,
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeout);
        const shouldRetry = attempt < maxRetries;
        if (shouldRetry) {
          continue;
        }
        throw new NetworkError('Network error while recording usage', { cause: error });
      }

      clearTimeout(timeout);
      const payload = (await safeJson(response)) as UsageResponse | Record<string, unknown> | null;

      if (response.status >= 500 && attempt < maxRetries) {
        continue;
      }

      if (response.status === 200 || response.status === 201) {
        if (!payload) {
          throw new ServerError('Empty response body from usage service', {
            status: response.status,
          });
        }
        return payload as UsageResponse;
      }

      throw mapHttpError(response.status, (payload as Record<string, unknown>) || null);
    }

    throw new NetworkError('Failed to record usage after retries');
  }

  return {
    recordUsage,
  };
}

export {
  UsageClientError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServerError,
  NetworkError,
};
