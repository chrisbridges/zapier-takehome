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
