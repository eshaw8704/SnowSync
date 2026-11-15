import type { TripSummary } from '@snowsync/shared';
import { daysUntil } from '../trips/tripFormat';

//The next step for one trip card on Home, in words (SS-154, Figma catalog 06). It reads both the trip phase and my participation
//because the right step depends on the combination; concurrent
// trips each get their own sentence
export function nextStepText(trip: TripSummary, now: Date = new Date()): string {
  const me = trip.myParticipation;
  switch (trip.state) {
    case 'CREATED':
      return 'Not published yet · members cannot see it';
    case 'OPEN_FOR_REGISTRATION': {
      if (me !== 'REGISTERED') return 'Registration open';
      const days = daysUntil(trip.startsAt, now);
      if (days === 0) return "You're registered · today";
      return `You're registered · ${days} ${days === 1 ? 'day' : 'days'} to go`;
    }
    case 'CHECK_IN':
      if (me === 'CHECKED_IN') return 'Checked in · the session starts soon';
      return 'Check-in open';
    case 'ACTIVE':
      if (me === 'ACTIVE') return 'Your crew is on snow';
      if (me === 'CHECKED_IN') return 'Session started · enter when you are ready';
      if (me === 'REGISTERED') return 'Session started · check in at the resort';
      return 'Trip in progress';
    case 'EXIT':
      return 'Trip is wrapping up';
    case 'COMPLETED':
      return 'Trip completed';
    case 'CANCELLED':
      return 'Trip cancelled';
  }
}
