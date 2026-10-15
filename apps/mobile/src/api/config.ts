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
