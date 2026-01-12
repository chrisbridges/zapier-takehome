export type UsageClientErrorOptions = ErrorOptions & {
  status?: number;
  code?: string;
  details?: unknown;
};

export class UsageClientError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: UsageClientErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends UsageClientError {}
export class NotFoundError extends UsageClientError {}
export class ConflictError extends UsageClientError {}
export class ServerError extends UsageClientError {}
export class NetworkError extends UsageClientError {}
