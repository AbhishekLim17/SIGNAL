import { logger } from '../utils/logger.js';

export function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/** Create an error carrying an HTTP status, for expected/validation failures. */
export function httpError(status, message) {
  const err = new Error(message);
  err.statusCode = status;
  return err;
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.statusCode || 500;
  if (status >= 500) logger.error(err);
  res.status(status).json({ error: err.message || 'Internal server error' });
}
