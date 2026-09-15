import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError } from '../../src/utils/errors.js';

describe('AppError', () => {
  it('sets statusCode, code, and message', () => {
    const err = new AppError('something went wrong', 500, 'INTERNAL_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.message).toBe('something went wrong');
    expect(err.isOperational).toBe(true);
  });

  it('is instanceof Error', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('uses 404 status and NOT_FOUND code', () => {
    const err = new NotFoundError('Patient');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Patient not found');
  });
});

describe('ValidationError', () => {
  it('uses 400 status and VALIDATION_ERROR code', () => {
    const err = new ValidationError('field required');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});
