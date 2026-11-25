import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ApiClientError } from '../../../src/api/apiClient';
import { SacStateSsoButton } from '../../../src/features/auth/SacStateSsoButton';
import {
  exchangeSsoCode,
  openSacStateSignIn,
  parseSsoReturn,
} from '../../../src/features/auth/ssoApi';
import { SsoCompleteScreen } from '../../../src/features/auth/SsoCompleteScreen';
import { SsoRedirectScreen } from '../../../src/features/auth/SsoRedirectScreen';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

let mockParams: { code?: string; error?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  WebBrowserResultType: { CANCEL: 'cancel', DISMISS: 'dismiss' },
}));
jest.mock('../../../src/features/auth/ssoApi', () => ({
  ...jest.requireActual('../../../src/features/auth/ssoApi'),
  exchangeSsoCode: jest.fn(),
}));

const SESSION = {
  accessToken: 'a',
  accessTokenExpiresAt: '2027-01-01T00:15:00.000Z',
  refreshToken: 'r',
  refreshTokenExpiresAt: '2027-02-01T00:00:00.000Z',
};

describe('Sac State SSO', () => {
  const originalFlag = process.env.EXPO_PUBLIC_SSO_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    mockParams = {};
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SSO_ENABLED = originalFlag;
  });

  describe('parseSsoReturn', () => {
    it('reads the one-time code or the reason', () => {
      expect(parseSsoReturn('snowsync://sso-complete?code=abc')).toEqual({ code: 'abc' });
      expect(parseSsoReturn('snowsync://sso-complete?error=CANCELLED')).toEqual({
        error: 'CANCELLED',
      });
      expect(parseSsoReturn('snowsync://sso-complete?error=weird')).toEqual({ error: 'FAILED' });
      expect(parseSsoReturn('snowsync://sso-complete')).toEqual({ error: 'FAILED' });
      expect(parseSsoReturn('snowsync://sso-complete?code=abc#_=_')).toEqual({ code: 'abc' });
    });
  });

  describe('openSacStateSignIn', () => {
    it('opens the server start URL and returns to the app link', async () => {
      jest
        .mocked(WebBrowser.openAuthSessionAsync)
        .mockResolvedValue({ type: 'success', url: 'snowsync://sso-complete?code=xyz' });
      await expect(openSacStateSignIn()).resolves.toEqual({ code: 'xyz' });
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        expect.stringMatching(/\/auth\/sso\/start$/),
        'snowsync://sso-complete',
      );
    });

    it('treats a closed browser as cancelled', async () => {
      jest
        .mocked(WebBrowser.openAuthSessionAsync)
        .mockResolvedValue({ type: WebBrowser.WebBrowserResultType.CANCEL });
      await expect(openSacStateSignIn()).resolves.toEqual({ error: 'CANCELLED' });
    });
  });

  describe('SacStateSsoButton', () => {
    it('stays hidden until the flag is on', () => {
      process.env.EXPO_PUBLIC_SSO_ENABLED = 'false';
      render(<SacStateSsoButton dividerLabel="or sign in with email" />);
      expect(screen.queryByRole('button', { name: 'Continue with Sac State SSO' })).toBeNull();
    });

    it('opens the redirect screen when the flag is on', () => {
      process.env.EXPO_PUBLIC_SSO_ENABLED = 'true';
      render(<SacStateSsoButton dividerLabel="or sign in with email" />);
      expect(screen.getByText('or sign in with email')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Sac State SSO' }));
      expect(router.push).toHaveBeenCalledWith('/sso');
    });
  });

  describe('SsoRedirectScreen', () => {
    it('explains the secure redirect and continues to the completion screen', async () => {
      jest
        .mocked(WebBrowser.openAuthSessionAsync)
        .mockResolvedValue({ type: 'success', url: 'snowsync://sso-complete?code=xyz' });
      render(<SsoRedirectScreen />);
      expect(screen.getByText(/does not see or store your university/)).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Continue to Sac State' }));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/sso-complete?code=xyz'));
    }, 10000);

    it('explains a cancelled sign-in and keeps the way back', async () => {
      jest
        .mocked(WebBrowser.openAuthSessionAsync)
        .mockResolvedValue({ type: WebBrowser.WebBrowserResultType.CANCEL });
      render(<SsoRedirectScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Continue to Sac State' }));
      expect(await screen.findByText(/sign-in was cancelled/)).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('SsoCompleteScreen', () => {
    it('trades the code for a session once', async () => {
      mockParams = { code: 'one-time' };
      jest.mocked(exchangeSsoCode).mockResolvedValue(SESSION);
      render(<SsoCompleteScreen />);
      expect(screen.getByText('Completing sign in…')).toBeTruthy();
      await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('a'));
      expect(exchangeSsoCode).toHaveBeenCalledTimes(1);
      expect(exchangeSsoCode).toHaveBeenCalledWith('one-time');
    });

    it('explains an expired code and leads back to sign in', async () => {
      mockParams = { code: 'old' };
      jest.mocked(exchangeSsoCode).mockRejectedValue(new Error('401'));
      render(<SsoCompleteScreen />);
      expect(await screen.findByText(/expired or was already used/)).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(router.back).toHaveBeenCalled();
    });

    it('sends a code once even when two completion screens open with it (Android)', async () => {
      mockParams = { code: 'shared' };
      jest.mocked(exchangeSsoCode).mockResolvedValue(SESSION);
      render(<SsoCompleteScreen />);
      render(<SsoCompleteScreen />);
      await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('a'));
      expect(exchangeSsoCode).toHaveBeenCalledTimes(1);
    });

    it('explains a lost connection instead of an expired code', async () => {
      mockParams = { code: 'offline' };
      jest
        .mocked(exchangeSsoCode)
        .mockRejectedValue(new ApiClientError({ code: 'NETWORK_ERROR', message: 'offline' }));
      render(<SsoCompleteScreen />);
      expect(await screen.findByText(/couldn't reach SnowSync/)).toBeTruthy();
    });

    it('trades a new code that arrives on the same screen', async () => {
      mockParams = { code: 'first' };
      jest.mocked(exchangeSsoCode).mockRejectedValueOnce(new Error('401'));
      const view = render(<SsoCompleteScreen />);
      expect(await screen.findByText(/expired or was already used/)).toBeTruthy();
      mockParams = { code: 'second' };
      jest.mocked(exchangeSsoCode).mockResolvedValueOnce(SESSION);
      view.rerender(<SsoCompleteScreen />);
      expect(screen.getByText('Completing sign in…')).toBeTruthy();
      await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('a'));
      expect(exchangeSsoCode).toHaveBeenLastCalledWith('second');
    });

    it('explains a deactivated account without calling the server', async () => {
      mockParams = { error: 'ACCOUNT_DEACTIVATED' };
      render(<SsoCompleteScreen />);
      expect(await screen.findByText(/This account is deactivated/)).toBeTruthy();
      expect(exchangeSsoCode).not.toHaveBeenCalled();
    });
  });
});
