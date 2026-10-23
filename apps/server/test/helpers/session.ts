import { signAccessToken } from '../../src/modules/auth/tokenService';

/** An 'Authorization' header value for 'userId', for calling protected routes in tests. */
export async function bearerFor(userId: string): Promise<string> {
  const { token } = await signAccessToken(userId);
  return `Bearer ${token}`;
}
