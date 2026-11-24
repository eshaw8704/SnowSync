import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { HeaderBackButton } from '../../src/components/HeaderBackButton';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

describe('HeaderBackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('goes back when there is a screen to go back to', () => {
    render(<HeaderBackButton fallbackHref="/trips" />);
    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('opens the fallback screen when there is no history', () => {
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    render(<HeaderBackButton label="Profile" fallbackHref="/profile" />);
    expect(screen.getByText('Profile')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to Profile' }));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/profile');
  });
});
