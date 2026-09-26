import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createInternalNeonAuth } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getDataApiToken } from '../../src/api/token.js';

// Disposable branch only. Credentials and JWTs stay in memory. No email is
// sent: verify that the branch has signup/signin verification emails disabled.
export async function createTestIdentity(authUrl, { disposable = false } = {}) {
  assert.equal(disposable, true);
  const suffix = randomUUID().replaceAll('-', '');
  const credentials = { email: `security_${suffix}@example.invalid`, password: randomUUID() };
  const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' };
  const signup = await fetch(`${authUrl}/sign-up/email`, {
    method: 'POST', headers, body: JSON.stringify({ ...credentials, name: 'FinDuo JWT security test' }),
  });
  assert.ok(signup.ok, `Disposable signup HTTP ${signup.status}`);
  const signupData = await signup.json();
  const signin = await fetch(`${authUrl}/sign-in/email`, {
    method: 'POST', headers, body: JSON.stringify(credentials),
  });
  assert.ok(signin.ok, `Disposable signin HTTP ${signin.status}`);
  const cookies = signin.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  const auth = createInternalNeonAuth(authUrl, {
    adapter: BetterAuthReactAdapter({ fetchOptions: { headers: {
      Cookie: cookies,
      Origin: 'http://localhost:5173',
      // Keep disposable accounts isolated from the SDK's process-wide cache.
      'X-Force-Fetch': 'true',
    } } }),
  });
  const token = await getDataApiToken(auth);
  assert.equal(typeof token, 'string');
  assert.equal(token.split('.').length, 3);
  const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`)));
  assert.equal(payload.sub, signupData.user.id);
  assert.equal(payload.role, 'authenticated');
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
  assert.equal(payload.iss, new URL(authUrl).origin);
  console.log('JWT verified', JSON.stringify({
    claimNames: Object.keys(payload).sort(),
    identityMatchesAccount: true,
    role: payload.role,
    unexpired: true,
    signatureVerified: true,
    method: 'getJWTToken',
  }));
  return { id: payload.sub, token, suffix, auth };
}
