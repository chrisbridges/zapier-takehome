'use strict';

const crypto = require('node:crypto');
const { stableStringify } = require('../utils/stableStringify');
const { ValidationError, NotFoundError, ConflictError } = require('./errors');

function parseUsageInput(input) {
  const errors = [];
  const parsed = {};

  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object', [
      { field: 'body', message: 'Expected a JSON object.' },
    ]);
  }

  const customerId = input.customerId;
  if (!Number.isInteger(customerId)) {
    errors.push({ field: 'customerId', message: 'customerId must be an integer.' });
  } else {
    parsed.customerId = customerId;
  }

  const service = input.service;
  if (typeof service !== 'string' || service.trim() === '') {
    errors.push({ field: 'service', message: 'service must be a non-empty string.' });
  } else {
    parsed.service = service.trim();
  }

  const unitsConsumed = input.unitsConsumed;
  if (!Number.isInteger(unitsConsumed) || unitsConsumed < 0) {
    errors.push({ field: 'unitsConsumed', message: 'unitsConsumed must be a non-negative integer.' });
  } else {
    parsed.unitsConsumed = unitsConsumed;
  }

  const pricePerUnit = input.pricePerUnit;
  if (typeof pricePerUnit !== 'number' || Number.isNaN(pricePerUnit) || pricePerUnit < 0) {
    errors.push({ field: 'pricePerUnit', message: 'pricePerUnit must be a non-negative number.' });
  } else {
    parsed.pricePerUnit = pricePerUnit;
  }

  let occurredAt = input.occurredAt;
  if (occurredAt === undefined || occurredAt === null || occurredAt === '') {
    parsed.occurredAt = new Date().toISOString();
  } else {
    const parsedDate = new Date(occurredAt);
    if (Number.isNaN(parsedDate.valueOf())) {
      errors.push({ field: 'occurredAt', message: 'occurredAt must be an ISO timestamp.' });
    } else {
      parsed.occurredAt = parsedDate.toISOString();
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return parsed;
}

function buildBillingPeriod(occurredAt) {
  return occurredAt.slice(0, 7);
}

function hashPayload(payload) {
  const stableJson = stableStringify(payload);
  return crypto.createHash('sha256').update(stableJson).digest('hex');
}

function createUsageService(db) {
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

  const recordUsage = (input, idempotencyKey) => {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      throw new ValidationError('Idempotency-Key header is required', [
        { field: 'Idempotency-Key', message: 'Idempotency-Key header is required.' },
      ]);
    }

    const parsed = parseUsageInput(input);
    const billingPeriod = buildBillingPeriod(parsed.occurredAt);
    const pricePerUnitCents = Math.round(parsed.pricePerUnit * 100);

    const payloadForHash = {
      customerId: parsed.customerId,
      service: parsed.service,
      unitsConsumed: parsed.unitsConsumed,
      pricePerUnit: parsed.pricePerUnit,
      occurredAt: parsed.occurredAt,
    };

    const requestHash = hashPayload(payloadForHash);
    const existing = selectIdempotency.get(idempotencyKey);

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictError('Idempotency key reuse with different payload.');
      }

      const stored = JSON.parse(existing.response_body);
      return {
        status: 200,
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

      const usageRecord = {
        id: result.lastInsertRowid,
        customerId: parsed.customerId,
        service: parsed.service,
        unitsConsumed: parsed.unitsConsumed,
        pricePerUnit: pricePerUnitCents / 100,
        occurredAt: parsed.occurredAt,
        billingPeriod,
      };

      const responseBody = {
        usageRecord,
        idempotentReplay: false,
      };

      insertIdempotency.run(
        idempotencyKey,
        requestHash,
        JSON.stringify(responseBody),
        201,
        usageRecord.id,
        now
      );

      return responseBody;
    });

    return {
      status: 201,
      body: transaction(),
    };
  };

  return {
    recordUsage,
  };
}

module.exports = {
  createUsageService,
};
