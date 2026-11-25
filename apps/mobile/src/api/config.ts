import { Platform } from 'react-native';

/**
 * Where the SnowSync server is reachable from this device.
 * The Android emulator reaches the host computer at 10.0.2.2; iOS simulators use localhost.
 * Set EXPO_PUBLIC_API_URL in apps/mobile/.env to override (required on a physical phone).
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

/** Every request is abandoned after this many milliseconds and reported as TIMEOUT. */
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * True when "Continue with Sac State SSO" should show (SS-38). Off until Sac State IT approves the
 * integration; turn it on with EXPO_PUBLIC_SSO_ENABLED=true in apps/mobile/.env.
 */
export function isSsoEnabled(): boolean {
  return process.env.EXPO_PUBLIC_SSO_ENABLED === 'true';
}
