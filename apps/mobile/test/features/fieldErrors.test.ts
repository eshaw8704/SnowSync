import { signupRequestSchema } from '@snowsync/shared';
import { fieldErrors, serverFieldErrors } from '../../src/features/forms/fieldErrors';

describe('fieldErrors', () => {
  it('keeps the first message per field', () => {
    const result = signupRequestSchema.safeParse({
      displayName: '',
      email: 'x@gmail.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      displayName: 'Enter your full name.',
      email: 'Use your Sac State email (@csus.edu).',
      password: 'Use at least 12 characters.',
    });
  });

  it('reads server VALIDATION_FAILED details', () => {
    expect(serverFieldErrors({ issues: [{ path: 'email', message: 'Bad' }] })).toEqual({
      email: 'Bad',
    });
    expect(serverFieldErrors(undefined)).toEqual({});
  });

  it('skips null issues and keeps fields named like Object.prototype keys', () => {
    expect(
      serverFieldErrors({
        issues: [null, { path: 'constructor', message: 'Bad' }],
      }),
    ).toEqual({ constructor: 'Bad' });
  });
});
