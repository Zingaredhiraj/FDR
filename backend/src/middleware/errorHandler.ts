import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger';
import { sendError } from '../utils/response';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    sendError(res, 'Validation error', 400, err.flatten().fieldErrors);
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled operational error');
    }
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    sendError(res, err.message, 400);
    return;
  }

  // Unexpected errors
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unexpected error');
  sendError(res, 'Internal server error', 500);
}
