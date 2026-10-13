import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  ConnectionStatus,
  HTTP_STATUS_BY_ERROR_CODE,
  ParticipationState,
  TripState,
  UserRole,
  isApiErrorCode,
  isApiFailure,
  type ApiResponse,
} from '../src';

describe('@snowsync/shared', () => {
  it('lists exactly the agreed error codes', () => {
    expect(API_ERROR_CODES).toEqual([
      'VALIDATION_FAILED',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'RATE_LIMITED',
      'INTERNAL',
      'NETWORK_ERROR',
      'TIMEOUT',
    ]);
  });

  it('maps every server error code to an HTTP status', () => {
    expect(HTTP_STATUS_BY_ERROR_CODE).toEqual({
      VALIDATION_FAILED: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      INTERNAL: 500,
    });
  });

  it('recognizes error codes', () => {
    expect(isApiErrorCode('NOT_FOUND')).toBe(true);
    expect(isApiErrorCode('TEAPOT')).toBe(false);
    expect(isApiErrorCode(404)).toBe(false);
  });

  it('narrows failed responses', () => {
    const failed: ApiResponse<number> = { ok: false, error: { code: 'INTERNAL', message: 'x' } };
    const passed: ApiResponse<number> = { ok: true, data: 1 };
    expect(isApiFailure(failed)).toBe(true);
    expect(isApiFailure(passed)).toBe(false);
  });

  it('matches the System Map enums exactly', () => {
    expect(Object.values(TripState)).toEqual([
      'CREATED',
      'OPEN_FOR_REGISTRATION',
      'CHECK_IN',
      'ACTIVE',
      'EXIT',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(Object.values(ParticipationState)).toEqual([
      'NOT_REGISTERED',
      'REGISTERED',
      'CHECKED_IN',
      'ACTIVE',
      'CHECKED_OUT',
      'NO_SHOW',
      'LEFT_EARLY',
    ]);
    expect(Object.values(UserRole)).toEqual(['MEMBER', 'OFFICER']);
    expect(Object.values(ConnectionStatus)).toEqual([
      'ONLINE',
      'WEAK',
      'OFFLINE',
      'RECONNECTING',
      'SYNCHRONIZING',
      'SYNC_FAILED',
    ]);
  });
});
