import { EMPTY_DRAFT, type TripDraft } from '../../../src/features/tripCreation/tripDraft';

/** A complete, valid draft: Sugar Bowl club day. */
export const VALID_DRAFT: TripDraft = {
  ...EMPTY_DRAFT,
  name: 'Sugar Bowl club day',
  description: 'A full day on snow with the Sac State crew.',
  startsAt: '2027-02-06T16:00:00.000Z',
  endsAt: '2027-02-07T00:00:00.000Z',
  resortName: 'Sugar Bowl',
  radiusMeters: 500,
  registrationOpensAt: '2027-01-18T17:00:00.000Z',
  registrationClosesAt: '2027-02-05T02:00:00.000Z',
  capacityText: '24',
  costText: '45',
  checkInStartsAt: '2027-02-06T15:30:00.000Z',
  sessionStartsAt: '2027-02-06T16:00:00.000Z',
  exitStartsAt: '2027-02-07T00:00:00.000Z',
};
