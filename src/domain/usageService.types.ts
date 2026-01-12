export type UsageInput = {
  customerId: number;
  service: string;
  unitsConsumed: number;
  pricePerUnit: number;
  occurredAt?: string;
};

export type HashPayload = Omit<UsageInput, 'occurredAt'> & {
  occurredAt: string | null;
};

export type ParsedUsageInput = {
  customerId: number;
  service: string;
  unitsConsumed: number;
  pricePerUnit: number;
  occurredAt: string;
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

export type UsageServiceResult = {
  status: 200 | 201;
  body: UsageResponse;
};

export type IdempotencyRow = {
  idempotency_key: string;
  request_hash: string;
  response_body: string;
};
