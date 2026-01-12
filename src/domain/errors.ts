export type ValidationDetail = {
  field: string;
  message: string;
};

export class ValidationError extends Error {
  readonly details?: ValidationDetail[];

  constructor(message: string, details?: ValidationDetail[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
