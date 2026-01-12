import express, { type NextFunction, type Request, type Response } from 'express';
import { createUsageService } from '../domain/usageService';
import type { DatabaseInstance } from '../db/database';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors';

type AppDependencies = {
  db: DatabaseInstance;
};

export function createApp({ db }: AppDependencies) {
  const app = express();
  const usageService = createUsageService(db);

  app.use(express.json());

  app.post('/usage', (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey = req.get('Idempotency-Key');
      const result = usageService.recordUsage(req.body, idempotencyKey);
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
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

    const parseError = err as { type?: string };
    if (parseError && parseError.type === 'entity.parse.failed') {
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
