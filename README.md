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
npm run build
npm start
```

For local development without a build step:

```bash
npm run dev
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

TypeScript usage:

```ts
import { createUsageClient } from './src/lib';
```

If you are using compiled output (`npm run build`), import from `dist/lib` instead:

```js
const { createUsageClient } = require('./dist/lib');

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

## Docker

Build the image:

```bash
docker build -t usage-api .
```

Run the container:

```bash
docker run --rm -p 3000:3000 -v $(pwd)/data:/app/data usage-api
```

## Bruno Collection

I created a Bruno collection here so that anyone could test the API's functionality. Normally, I'm a big fan of including this within the repo as it allows business analysts, other engineers, etc to quickly and easily test functionality of the API.

Unfortunately, I was running into issues debugging the collection so it is not expected to work. I kept it within this project to highlight higher-level thinking for production-level applications. I wanted to stay within the allotted time limit, so this was a trade-off I conceded. Functionality was thoroughly tested through code.

## Assumptions & Tradeoffs

- “Current bill” is defined as the current calendar month in UTC, derived from `occurredAt`.
- The API accepts one usage record per request.
- `pricePerUnit` is stored internally in integer cents via rounding (`Math.round`).
- Authentication, rate limiting, aggregation, and multi-currency support are out of scope.

## Future Improvements

- Batching multiple requests could be enabled. This was foregone to pare down scope and complete the app within the allotted time.
- Postgres would be implemented over SQLite.
- Working Bruno collection
- More robust and informative logging

## AI

ChatGPT's Codex extension within VS Code was leveraged to improve test coverage and automate server boilerplate. My philosophy for AI is to heavily leverage test-driven development and iterate the functionality from there. Then, we can optimize for human-readability and style.

For me personally, AI tools have renewed my love of code. It automates away so much of the boring stuff, while empowering me to focus on the aspects that are higher-leverage and more fun.

That said, human wisdom and sound judgement are at a higher premium than ever. These tools are amazing when they work, but we can get in trouble when they are blindly trusted.

## Conclusion

Thank you for your time and consideration. This was fun 😄
