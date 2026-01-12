# Zapier Usage Tracking Takehome

## Overview
This project implements a small billing usage system with:
- A single POST `/usage` API for recording usage.
- A client library that handles retries and idempotency.
- Tests for the API and client.

## Requirements
- Node.js 18+

## Setup
```bash
npm install
```

## Run the API
```bash
npm start
```

Environment variables:
- `PORT` (default: 3000)
- `DATABASE_PATH` (default: `./data/usage.sqlite`)

Example request:
```bash
curl -X POST http://localhost:3000/usage \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 2f0d7e1f-1b9a-4e9c-8dc0-2b7a1b65e1d3' \
  -d '{"customerId":123,"service":"Database Hosting","unitsConsumed":58,"pricePerUnit":0.05}'
```

## Client Library
```js
const { createUsageClient } = require('./src/lib');

const client = createUsageClient({ baseUrl: 'http://localhost:3000' });

const result = await client.recordUsage({
  customerId: 123,
  service: 'Database Hosting',
  unitsConsumed: 58,
  pricePerUnit: 0.05,
});

console.log(result);
```

## Tests
```bash
npm test
```

## Assumptions & Tradeoffs
- “Current bill” is defined as the current calendar month in UTC, derived from `occurredAt`.
- The API accepts one usage record per request.
- `pricePerUnit` is stored internally in integer cents via rounding (`Math.round`).
- Authentication, rate limiting, aggregation, and multi-currency support are out of scope.
