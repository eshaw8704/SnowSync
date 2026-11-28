import type { CancelRegistrationResult, MyRegistration, RegisterResult } from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

const base = (tripId: string) => `/trips/${encodeURIComponent(tripId)}`;

/** GET /trips/:id/registration: my own registration, charge and check-in on one trip. */
export function getMyRegistration(tripId: string): Promise<MyRegistration> {
  return authRequest<MyRegistration>('GET', `${base(tripId)}/registration`);
}

/** POST /trips/:id/registration. Reuse the same opId when retrying so a retry never doubles up. */
export function register(tripId: string, opId: string): Promise<RegisterResult> {
  return authRequest<RegisterResult>('POST', `${base(tripId)}/registration`, { body: { opId } });
}

/** DELETE /trips/:id/registration. Safe to repeat: cancelling when not registered changes nothing. */
export function cancelRegistration(tripId: string): Promise<CancelRegistrationResult> {
  return authRequest<CancelRegistrationResult>('DELETE', `${base(tripId)}/registration`);
}
