import type { TripDetail, TripSummary } from '@snowsync/shared';

//An open Heavenly trip the viewer has not registered for (Figma catalog 08, Available).
export const HEAVENLY: TripSummary = {
  id: 'trip-heavenly',
  name: 'Heavenly club day',
  resortName: 'Heavenly',
  resortTimeZone: 'America/Los_Angeles',
  startsAt: '2027-01-30T16:00:00.000Z',
  endsAt: '2027-01-31T00:00:00.000Z',
  state: 'OPEN_FOR_REGISTRATION',
  capacity: 24,
  registeredCount: 16,
  costCents: 5000,
  myParticipation: 'NOT_REGISTERED',
};

//The same trip as GET /trips/:id returns it.
export const HEAVENLY_DETAIL: TripDetail = {
  ...HEAVENLY,
  description: 'A full day on snow with the Sac State crew.',
  version: 3,
  registrationOpensAt: '2027-01-18T17:00:00.000Z',
  registrationClosesAt: '2027-01-29T02:00:00.000Z',
  checkInStartsAt: '2027-01-30T15:30:00.000Z',
  sessionStartsAt: '2027-01-30T16:00:00.000Z',
  exitStartsAt: '2027-01-31T00:00:00.000Z',
  geofence: { latitude: 38.9353, longitude: -119.94, radiusMeters: 500, label: 'base lodge' },
  officers: [{ id: 'o1', displayName: 'Olivia Officer', role: 'OFFICER' }],
};
