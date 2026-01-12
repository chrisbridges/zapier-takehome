'use strict';

class UsageClientError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

class ValidationError extends UsageClientError {}
class NotFoundError extends UsageClientError {}
class ConflictError extends UsageClientError {}
class ServerError extends UsageClientError {}
class NetworkError extends UsageClientError {}

module.exports = {
  UsageClientError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServerError,
  NetworkError,
};
