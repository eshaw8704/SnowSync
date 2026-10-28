import type { MeResponse } from '@snowsync/shared';
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'snowsync.refreshToken';
const CACHED_USER_KEY = 'snowsync.cachedUser';

//The only place tokens touch the disk: the iOS Keychain / Android Keystore via expo-secure-store.
//Tokens are never written to SQLite, AsyncStorage or logs (System Map §01).
export const tokenStorage = {
  readRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  saveRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  async readCachedUser(): Promise<MeResponse | null> {
    const raw = await SecureStore.getItemAsync(CACHED_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MeResponse;
    } catch {
      return null;
    }
  },
  saveCachedUser: (user: MeResponse) =>
    SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(user)),
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(CACHED_USER_KEY);
  },
};
