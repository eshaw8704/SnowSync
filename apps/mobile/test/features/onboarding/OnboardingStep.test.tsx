import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { OnboardingStep } from '../../../src/features/onboarding/OnboardingStep';

jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('OnboardingStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses navigation history when Back is pressed', () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);

    render(
      <OnboardingStep
        step={3}
        title="Someone we can call"
        primaryLabel="Continue"
        onPrimary={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('navigates to the previous onboarding step when history is empty', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);

    render(
      <OnboardingStep
        step={3}
        title="Someone we can call"
        primaryLabel="Continue"
        onPrimary={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(onboarding)/profile');
  });

  it('navigates to Welcome from step 2 when history is empty', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);

    render(
      <OnboardingStep
        step={2}
        title="Your mountain profile"
        primaryLabel="Continue"
        onPrimary={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(router.replace).toHaveBeenCalledWith('/(onboarding)');
  });

  it('displays the correct onboarding progress', () => {
    render(
      <OnboardingStep
        step={4}
        title="The updates you need"
        primaryLabel="Save preferences"
        onPrimary={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Step 4 of 7')).toBeTruthy();
    expect(screen.getByText('4 of 7')).toBeTruthy();
  });

  it('disables Continue when primaryDisabled is true', () => {
    render(
      <OnboardingStep
        step={3}
        title="Someone we can call"
        primaryLabel="Save & continue"
        onPrimary={jest.fn()}
        primaryDisabled
      />,
    );

    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
  });

  it('does not display Back on the Welcome step', () => {
    render(
      <OnboardingStep
        step={1}
        title="Welcome to SnowSync"
        primaryLabel="Get started"
        onPrimary={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy();
  });
});
