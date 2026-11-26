import type { MyRegistration, TripDetail } from '@snowsync/shared';

/** What the registration panel on Trip detail shows (Figma catalog 10, pages 32–35). */
export type PanelView =
  'hidden' | 'open' | 'full' | 'closed' | 'notYetOpen' | 'registered' | 'checkedIn' | 'final';

/** Decides the panel from the trip and my registration. `now` is a parameter so tests are exact. */
export function panelView(
  trip: TripDetail,
  registration: MyRegistration,
  now: Date = new Date(),
): PanelView {
  switch (registration.participation) {
    case 'REGISTERED':
      return 'registered';
    case 'CHECKED_IN':
    case 'ACTIVE':
      return 'checkedIn';
    case 'CHECKED_OUT':
    case 'NO_SHOW':
    case 'LEFT_EARLY':
      return 'final';
    case 'NOT_REGISTERED':
      break;
  }
  if (trip.state === 'CREATED') return 'notYetOpen';
  if (trip.state === 'OPEN_FOR_REGISTRATION' && now < new Date(trip.registrationClosesAt)) {
    return trip.registeredCount >= trip.capacity ? 'full' : 'open';
  }
  if (['OPEN_FOR_REGISTRATION', 'CHECK_IN', 'ACTIVE'].includes(trip.state)) return 'closed';
  return 'hidden';
}

/** Where the registration flow ends up, as the result screen's `outcome` parameter. */
export type RegistrationOutcome = 'registered' | 'already' | 'full' | 'closed';

/** Reads the outcome parameter and rejects invalid values. */
export function parseOutcome(raw: string | undefined): RegistrationOutcome | null {
  if (raw === 'registered' || raw === 'already' || raw === 'full' || raw === 'closed') {
    return raw;
  }

  return null;
}
