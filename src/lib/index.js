'use strict';

const { randomUUID } = require('node:crypto');
const {
  UsageClientError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServerError,
  NetworkError,
} = require('./errors');

function resolveFetch(customFetch) {
  if (customFetch) {
    return customFetch;
  }
  if (typeof fetch === 'function') {
    return fetch;
  }
  throw new Error('No fetch implementation available. Provide one in config.');
}

async function safeJson(response) {
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

function mapHttpError(status, payload) {
  const message = payload && payload.message
    ? payload.message
    : `Request failed with status ${status}`;
  const options = {
    status,
    code: payload && payload.code,
    details: payload && payload.details,
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

function createUsageClient(config = {}) {
  if (!config.baseUrl) {
    throw new Error('baseUrl is required');
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const timeoutMs = config.timeoutMs ?? 5000;
  const maxRetries = config.maxRetries ?? 2;
  const fetchImpl = resolveFetch(config.fetch);

  async function recordUsage(params, options = {}) {
    const idempotencyKey = options.idempotencyKey || randomUUID();
    const url = `${baseUrl}/usage`;
    const body = JSON.stringify(params);

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let response;
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
      const payload = await safeJson(response);

      if (response.status >= 500 && attempt < maxRetries) {
        continue;
      }

      if (response.status === 200 || response.status === 201) {
        return payload;
      }

      throw mapHttpError(response.status, payload || {});
    }

    throw new NetworkError('Failed to record usage after retries');
  }

  return {
    recordUsage,
  };
}

module.exports = {
  createUsageClient,
  UsageClientError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServerError,
  NetworkError,
};
