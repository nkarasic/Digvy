import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, exportJWK } from 'jose';
import { verifyAccessToken, statusForVerifyError } from '../middleware/auth.js';

// A locally generated ES256 keypair stands in for Supabase's JWKS, so these
// tests exercise the real verification path without touching the network.
const ISSUER = 'https://project.supabase.co/auth/v1';

const { publicKey, privateKey } = await generateKeyPair('ES256');
const other = await generateKeyPair('ES256');

function signer(claims = {}) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('1h');
}

test('verifyAccessToken accepts a well-formed Supabase token and returns its claims', async () => {
  const token = await signer({ role: 'authenticated' }).sign(privateKey);
  const payload = await verifyAccessToken(token, publicKey, ISSUER);
  assert.equal(payload.sub, 'user-123');
  assert.equal(payload.aud, 'authenticated');
});

test('verifyAccessToken rejects a token signed by a different key', async () => {
  const token = await signer().sign(other.privateKey);
  await assert.rejects(
    () => verifyAccessToken(token, publicKey, ISSUER),
    (err) => statusForVerifyError(err) === 401,
  );
});

test('verifyAccessToken rejects an expired token', async () => {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setSubject('user-123')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(privateKey);

  await assert.rejects(
    () => verifyAccessToken(token, publicKey, ISSUER),
    (err) => err.code === 'ERR_JWT_EXPIRED' && statusForVerifyError(err) === 401,
  );
});

test('verifyAccessToken rejects a token minted for another Supabase project', async () => {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer('https://someone-else.supabase.co/auth/v1')
    .setAudience('authenticated')
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  await assert.rejects(
    () => verifyAccessToken(token, publicKey, ISSUER),
    (err) => statusForVerifyError(err) === 401,
  );
});

// Supabase's anon/service keys carry other audiences; only a signed-in user's
// token is 'authenticated'.
test('verifyAccessToken rejects a token with the wrong audience', async () => {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(ISSUER)
    .setAudience('anon')
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  await assert.rejects(
    () => verifyAccessToken(token, publicKey, ISSUER),
    (err) => statusForVerifyError(err) === 401,
  );
});

test('verifyAccessToken accepts the array form of the audience claim', async () => {
  const token = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(ISSUER)
    .setAudience(['authenticated', 'someone-else'])
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const payload = await verifyAccessToken(token, publicKey, ISSUER);
  assert.equal(payload.sub, 'user-123');
});

// A wrong audience is rejected even when `role` says otherwise, so the
// fallback can't be used to smuggle a non-user token through.
test('verifyAccessToken rejects a wrong audience even if role says authenticated', async () => {
  const token = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(ISSUER)
    .setAudience('anon')
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  await assert.rejects(
    () => verifyAccessToken(token, publicKey, ISSUER),
    (err) => statusForVerifyError(err) === 401,
  );
});

// The classic algorithm-confusion attack: take the public verifying key, treat
// it as an HMAC secret, and sign your own token with it. Pinning `algorithms`
// to ES256/RS256 is what stops this.
test('verifyAccessToken rejects an HS256 token signed with the public key', async () => {
  // The attacker's "secret" is the public verifying key itself, which is not
  // secret at all — it is published in the JWKS.
  const secret = new TextEncoder().encode(JSON.stringify(await exportJWK(publicKey)));

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setSubject('attacker')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  await assert.rejects(
    () => verifyAccessToken(token, publicKey, ISSUER),
    (err) => statusForVerifyError(err) === 401,
  );
});

test('statusForVerifyError maps infrastructure failures to 503, not 401', () => {
  // A 401 makes the client sign the user out, so a JWKS fetch failing must not
  // produce one.
  assert.equal(statusForVerifyError(new Error('fetch failed')), 503);
  assert.equal(statusForVerifyError({ code: 'ERR_JWKS_TIMEOUT' }), 503);
  assert.equal(statusForVerifyError(undefined), 503);

  assert.equal(statusForVerifyError({ code: 'ERR_JWT_EXPIRED' }), 401);
  assert.equal(statusForVerifyError({ code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' }), 401);
});
