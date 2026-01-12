'use strict';

const express = require('express');
const { createUsageService } = require('../domain/usageService');
const { ValidationError, NotFoundError, ConflictError } = require('../domain/errors');

function createApp({ db }) {
  const app = express();
  const usageService = createUsageService(db);

  app.use(express.json());

  app.post('/usage', (req, res, next) => {
    try {
      const idempotencyKey = req.get('Idempotency-Key');
      const result = usageService.recordUsage(req.body, idempotencyKey);
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        code: 'validation_error',
        message: err.message,
        details: err.details,
      });
    }

    if (err instanceof NotFoundError) {
      return res.status(404).json({
        code: 'not_found',
        message: err.message,
      });
    }

    if (err instanceof ConflictError) {
      return res.status(409).json({
        code: 'conflict',
        message: err.message,
      });
    }

    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({
        code: 'invalid_json',
        message: 'Malformed JSON body.',
      });
    }

    console.error('Unhandled error', err);
    return res.status(500).json({
      code: 'server_error',
      message: 'Unexpected error occurred.',
    });
  });

  return app;
}

module.exports = {
  createApp,
};
