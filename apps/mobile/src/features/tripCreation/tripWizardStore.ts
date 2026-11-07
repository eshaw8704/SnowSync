import { create } from 'zustand';
import {
  EMPTY_DRAFT,
  validateConfiguration,
  validateStep,
  withDefaultSchedule,
  type TripDraft,
  type WizardStep,
} from './tripDraft';

/** The create-trip wizard's state: the draft, the current step and the errors shown on it. */
export interface TripWizardState {
  draft: TripDraft;
  step: WizardStep;
  errors: Record<string, string>;
  /** Merges fields into the draft and clears their errors. */
  update: (patch: Partial<TripDraft>) => void;
  /** Validates the current step; moves on only when it is valid. Returns whether it moved. */
  next: () => boolean;
  /** One step back (never below 1). */
  back: () => void;
  /** Jumps to a step (the Review step's "Edit details" links). */
  goTo: (step: WizardStep) => void;
  /**
   * Validates steps 1 to 4 together before creating. On a problem, jumps to the first step with
   * an error and returns false.
   */
  validateAll: () => boolean;
  /** Back to a blank wizard (after creating, or when the officer leaves). */
  reset: () => void;
}

/**
 * One wizard per phone, kept in memory while the officer moves between steps (so Back never loses
 * input). Step components never read it directly; TripWizardScreen passes them (value, onChange,
 * errors), which is what lets the Edit trip screen reuse them with its own state.
 */
export const useTripWizardStore = create<TripWizardState>()((set, get) => ({
  draft: EMPTY_DRAFT,
  step: 1,
  errors: {},
  update: (patch) =>
    set((state) => {
      const errors = { ...state.errors };
      for (const key of Object.keys(patch)) delete errors[key];
      return { draft: { ...state.draft, ...patch }, errors };
    }),
  next: () => {
    const { draft, step } = get();
    const errors = validateStep(step, draft);
    if (Object.keys(errors).length > 0) {
      set({ errors });
      return false;
    }
    const nextStep = Math.min(step + 1, 6) as WizardStep;
    set({
      step: nextStep,
      errors: {},
      draft: nextStep === 4 ? withDefaultSchedule(draft) : draft,
    });
    return true;
  },
  back: () => set((state) => ({ step: Math.max(state.step - 1, 1) as WizardStep, errors: {} })),
  goTo: (step) => set({ step, errors: {} }),
  validateAll: () => {
    const { firstInvalidStep, errors } = validateConfiguration(get().draft);
    if (firstInvalidStep !== null) {
      set({ step: firstInvalidStep, errors });
      return false;
    }
    return true;
  },
  reset: () => set({ draft: EMPTY_DRAFT, step: 1, errors: {} }),
}));
