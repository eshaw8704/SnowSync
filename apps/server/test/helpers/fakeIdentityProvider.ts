import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from 'jose';

/** Claims the fake provider puts in the next ID token. */
export interface FakeClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

/**
 * A tiny OpenID Connect provider for tests: discovery, JWKS and a token endpoint that checks the
 * PKCE verifier and signs an ID token with the claims you set. No network beyond localhost.
 */
export class FakeIdentityProvider {
  claims: FakeClaims = { sub: 'sac-123', email: 'riley@csus.edu', name: 'Riley Patel' };
  /** The nonce and PKCE challenge from the last authorization URL the server built. */
  nonce = '';
  challenge = '';
  private server: Server | null = null;
  private privateKey: CryptoKey | null = null;
  private jwk: JWK | null = null;
  issuer = '';

  async start(clientId: string): Promise<void> {
    const keys = await generateKeyPair('RS256');
    this.privateKey = keys.privateKey;
    this.jwk = { ...(await exportJWK(keys.publicKey)), kid: 'test', alg: 'RS256', use: 'sig' };
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', this.issuer);
      if (url.pathname === '/.well-known/openid-configuration') {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            issuer: this.issuer,
            authorization_endpoint: `${this.issuer}/authorize`,
            token_endpoint: `${this.issuer}/token`,
            jwks_uri: `${this.issuer}/jwks`,
          }),
        );
        return;
      }
      if (url.pathname === '/jwks') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ keys: [this.jwk] }));
        return;
      }
      if (url.pathname === '/token' && req.method === 'POST') {
        let raw = '';
        req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
        req.on('end', () => {
          const form = new URLSearchParams(raw);
          const verifier = form.get('code_verifier') ?? '';
          const challenge = createHash('sha256').update(verifier).digest('base64url');
          if (form.get('code') !== 'good-code' || challenge !== this.challenge) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'invalid_grant' }));
            return;
          }
          void new SignJWT({ ...this.claims, nonce: this.nonce })
            .setProtectedHeader({ alg: 'RS256', kid: 'test' })
            .setIssuer(this.issuer)
            .setAudience(clientId)
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(this.privateKey!)
            .then((idToken) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ id_token: idToken, token_type: 'Bearer' }));
            });
        });
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    this.issuer = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  /** Remembers the nonce and challenge from the authorization URL, as a real provider would. */
  authorize(location: string): { state: string } {
    const url = new URL(location);
    this.nonce = url.searchParams.get('nonce') ?? '';
    this.challenge = url.searchParams.get('code_challenge') ?? '';
    return { state: url.searchParams.get('state') ?? '' };
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }
}
