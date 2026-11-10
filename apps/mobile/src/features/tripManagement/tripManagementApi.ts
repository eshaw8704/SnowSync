import type {
  TransitionRequest,
  TransitionResponse,
  UpdateTripRequest,
  UpdateTripResponse,
} from '@snowsync/shared';
import { authRequest } from '../../api/authClient';

/** PATCH /trips/:id with the version the officer loaded (409 STALE_VERSION if someone saved first). */
export function updateTrip(
  tripId: string,
  request: UpdateTripRequest,
): Promise<UpdateTripResponse> {
  return authRequest<UpdateTripResponse>('PATCH', `/trips/${encodeURIComponent(tripId)}`, {
    body: request,
  });
}

/** DELETE /trips/:id: only a CREATED trip with no registrations (409 "Cancel this trip instead"). */
export function deleteTrip(tripId: string): Promise<{ deleted: true }> {
  return authRequest<{ deleted: true }>('DELETE', `/trips/${encodeURIComponent(tripId)}`);
}

/** POST /trips/:id/transitions: an officer starts the next phase early. */
export function transitionTrip(
  tripId: string,
  request: TransitionRequest,
): Promise<TransitionResponse> {
  return authRequest<TransitionResponse>(
    'POST',
    `/trips/${encodeURIComponent(tripId)}/transitions`,
    { body: request },
  );
}
