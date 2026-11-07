import { EMPTY_DRAFT } from '../../../src/features/tripCreation/tripDraft';
import { useTripWizardStore } from '../../../src/features/tripCreation/tripWizardStore';
import { VALID_DRAFT } from './fixtures';

describe('trip wizard store', () => {
  beforeEach(() => {
    useTripWizardStore.getState().reset();
  });

  it('stays on a step with errors and clears an error when its field changes', () => {
    const store = useTripWizardStore.getState();
    expect(store.next()).toBe(false);
    expect(useTripWizardStore.getState().errors.name).toBe('Use at least 3 characters.');
    useTripWizardStore.getState().update({ name: 'Sugar Bowl club day' });
    expect(useTripWizardStore.getState().errors.name).toBeUndefined();
  });

  it('moves forward, fills the schedule defaults on step 4 and goes back', () => {
    useTripWizardStore.setState({
      draft: { ...VALID_DRAFT, checkInStartsAt: null, sessionStartsAt: null, exitStartsAt: null },
      step: 3,
    });
    expect(useTripWizardStore.getState().next()).toBe(true);
    const { step, draft } = useTripWizardStore.getState();
    expect(step).toBe(4);
    expect(draft.sessionStartsAt).toBe(VALID_DRAFT.startsAt);
    useTripWizardStore.getState().back();
    expect(useTripWizardStore.getState().step).toBe(3);
  });

  it('jumps to the first invalid step before creating, and resets', () => {
    useTripWizardStore.setState({ draft: { ...VALID_DRAFT, name: '' }, step: 6 });
    expect(useTripWizardStore.getState().validateAll()).toBe(false);
    expect(useTripWizardStore.getState().step).toBe(1);
    useTripWizardStore.getState().reset();
    expect(useTripWizardStore.getState().draft).toEqual(EMPTY_DRAFT);
  });
});
