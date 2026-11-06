import type { TripDraft } from '../tripDraft';

/**
 * What every step component takes (SS-131): the draft, a way to change part of it, and the errors
 * to show. Steps hold no state of their own, so the create wizard and the Edit trip screen
 * (SS-136) can both drive them.
 */
export interface StepProps {
  value: TripDraft;
  onChange: (patch: Partial<TripDraft>) => void;
  errors: Record<string, string>;
}
