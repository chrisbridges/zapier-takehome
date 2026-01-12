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
  status: typeof HTTP_STATUS.OK | typeof HTTP_STATUS.CREATED;
  body: UsageResponse;
};

export type IdempotencyRow = {
  idempotency_key: string;
  request_hash: string;
  response_body: string;
};
import type { HTTP_STATUS } from '../httpStatus';
