import { createHash } from 'node:crypto';
import { stableStringify } from '../utils/stableStringify';
import { ConflictError, NotFoundError, ValidationError, type ValidationDetail } from './errors';
import type { DatabaseInstance } from '../db/database';
import { HTTP_STATUS } from '../httpStatus';
import type {
  HashPayload,
  IdempotencyRow,
  ParsedUsageInput,
  UsageRecord,
  UsageResponse,
  UsageServiceResult,
} from './usageService.types';

function parseUsageInput(input: unknown): ParsedUsageInput {
  const errors: ValidationDetail[] = [];
  const parsed: Partial<ParsedUsageInput> = {};

  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object', [
      { field: 'body', message: 'Expected a JSON object.' },
    ]);
  }

  const inputRecord = input as Record<string, unknown>;
  const customerId = inputRecord.customerId;
  if (typeof customerId !== 'number' || !Number.isInteger(customerId)) {
    errors.push({ field: 'customerId', message: 'customerId must be an integer.' });
  } else {
    parsed.customerId = customerId;
  }

  const service = inputRecord.service;
  if (typeof service !== 'string' || service.trim() === '') {
    errors.push({ field: 'service', message: 'service must be a non-empty string.' });
  } else {
    parsed.service = service.trim();
  }

  const unitsConsumed = inputRecord.unitsConsumed;
  if (typeof unitsConsumed !== 'number' || !Number.isInteger(unitsConsumed) || unitsConsumed < 0) {
    errors.push({ field: 'unitsConsumed', message: 'unitsConsumed must be a non-negative integer.' });
  } else {
    parsed.unitsConsumed = unitsConsumed;
  }

  const pricePerUnit = inputRecord.pricePerUnit;
  if (typeof pricePerUnit !== 'number' || Number.isNaN(pricePerUnit) || pricePerUnit < 0) {
    errors.push({ field: 'pricePerUnit', message: 'pricePerUnit must be a non-negative number.' });
  } else {
    parsed.pricePerUnit = pricePerUnit;
  }

  const occurredAt = inputRecord.occurredAt;
  if (occurredAt === undefined || occurredAt === null || occurredAt === '') {
    parsed.occurredAt = new Date().toISOString();
  } else {
    const parsedDate = new Date(String(occurredAt));
    if (Number.isNaN(parsedDate.valueOf())) {
      errors.push({ field: 'occurredAt', message: 'occurredAt must be an ISO timestamp.' });
    } else {
      parsed.occurredAt = parsedDate.toISOString();
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return parsed as ParsedUsageInput;
}

function buildBillingPeriod(occurredAt: string): string {
  return occurredAt.slice(0, 'YYYY-MM'.length);
}

function hashPayload(payload: HashPayload): string {
  const stableJson = stableStringify(payload);
  return createHash('sha256').update(stableJson).digest('hex');
}

export function createUsageService(db: DatabaseInstance) {
  const selectCustomer = db.prepare('SELECT id FROM customers WHERE id = ?');
  const selectIdempotency = db.prepare(
    'SELECT idempotency_key, request_hash, response_body FROM idempotency_keys WHERE idempotency_key = ?'
  );
  const insertUsage = db.prepare(
    `INSERT INTO usage_records
     (customer_id, service, units_consumed, price_per_unit_cents, occurred_at, billing_period, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertIdempotency = db.prepare(
    `INSERT INTO idempotency_keys
     (idempotency_key, request_hash, response_body, response_status, usage_record_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const recordUsage = (input: unknown, idempotencyKey: string | undefined): UsageServiceResult => {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      throw new ValidationError('Idempotency-Key header is required', [
        { field: 'Idempotency-Key', message: 'Idempotency-Key header is required.' },
      ]);
    }

    const parsed = parseUsageInput(input);
    const inputRecord = input as Record<string, unknown>;
    const occurredAtProvided =
      Object.prototype.hasOwnProperty.call(inputRecord, 'occurredAt') &&
      inputRecord.occurredAt !== undefined &&
      inputRecord.occurredAt !== null &&
      inputRecord.occurredAt !== '';
    const billingPeriod = buildBillingPeriod(parsed.occurredAt);
    const centsPerUnit = 100;
    const pricePerUnitCents = Math.round(parsed.pricePerUnit * centsPerUnit);

    const payloadForHash: HashPayload = {
      customerId: parsed.customerId,
      service: parsed.service,
      unitsConsumed: parsed.unitsConsumed,
      pricePerUnit: parsed.pricePerUnit,
      occurredAt: occurredAtProvided ? parsed.occurredAt : null,
    };

    const requestHash = hashPayload(payloadForHash);
    const existing = selectIdempotency.get(idempotencyKey) as IdempotencyRow | undefined;

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictError('Idempotency key reuse with different payload.');
      }

      const stored = JSON.parse(existing.response_body) as UsageResponse;
      return {
        status: HTTP_STATUS.OK,
        body: {
          ...stored,
          idempotentReplay: true,
        },
      };
    }

    const customer = selectCustomer.get(parsed.customerId);
    if (!customer) {
      throw new NotFoundError(`Customer ${parsed.customerId} not found.`);
    }

    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      const result = insertUsage.run(
        parsed.customerId,
        parsed.service,
        parsed.unitsConsumed,
        pricePerUnitCents,
        parsed.occurredAt,
        billingPeriod,
        now
      );

      const usageRecord: UsageRecord = {
        id: Number(result.lastInsertRowid),
        customerId: parsed.customerId,
        service: parsed.service,
        unitsConsumed: parsed.unitsConsumed,
        pricePerUnit: pricePerUnitCents / centsPerUnit,
        occurredAt: parsed.occurredAt,
        billingPeriod,
      };

      const responseBody: UsageResponse = {
        usageRecord,
        idempotentReplay: false,
      };

      insertIdempotency.run(
        idempotencyKey,
        requestHash,
        JSON.stringify(responseBody),
        HTTP_STATUS.CREATED,
        usageRecord.id,
        now
      );

      return responseBody;
    });

    return {
      status: HTTP_STATUS.CREATED,
      body: transaction(),
    };
  };

  return {
    recordUsage,
  };
}
