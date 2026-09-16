import { createRemoteJWKSet, jwtVerify } from 'jose';
import supabase from '../db.js';

// Supabase signs user JWTs with an asymmetric key (ES256) and publishes the
// public half at /auth/v1/.well-known/jwks.json, so a token's signature can be
// checked locally instead of asking the Auth API about it on every request —
// which cost a full network round trip before any query could even start.
//
// jose caches the key set per warm instance and refetches only when it sees a
// `kid` it doesn't know, so key rotation still works without paying a round
// trip per request.

// Pinned to the asymmetric algorithms Supabase issues. Without this an attacker
// could present an HS256 token signed with the (public) JWKS key and have it
// verify as though that key were a shared secret.
const ALGORITHMS = ['ES256', 'RS256'];

let jwks = null;

// Both built lazily for the same reason db.js defers its client: tests import
// this module without a .env present.
function authBase() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('Missing SUPABASE_URL in .env');
  return `${url}/auth/v1`;
}

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${authBase()}/.well-known/jwks.json`));
  }
  return jwks;
}

function bearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

// Supabase marks a signed-in user's token with aud 'authenticated'. It is
// normally a plain string, but the JWT spec allows an array and some Supabase
// configurations emit one, so both are accepted. `role` is only consulted when
// `aud` is absent entirely — a token that carries a *different* audience is
// rejected regardless of what `role` claims.
function isAuthenticatedUser(payload) {
  const { aud, role } = payload;
  if (aud !== undefined) {
    return Array.isArray(aud) ? aud.includes('authenticated') : aud === 'authenticated';
  }
  return role === 'authenticated';
}

// Verify a Supabase access token and return its claims. `keySet` and `issuer`
// are injectable so this can be tested against a locally generated key without
// reaching the network.
//
// The audience is checked by hand rather than via jwtVerify's `audience`
// option so that the array form above doesn't hard-fail.
export async function verifyAccessToken(token, keySet, issuer) {
  const { payload } = await jwtVerify(token, keySet ?? getJwks(), {
    issuer: issuer ?? authBase(),
    algorithms: ALGORITHMS,
  });

  if (!isAuthenticatedUser(payload)) {
    const err = new Error('Token does not represent an authenticated user');
    err.code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
    throw err;
  }

  return payload;
}

// jose error codes that mean "this token is no good." Anything else — a JWKS
// fetch timing out, DNS failing — is our problem, not the caller's, and must
// NOT surface as a 401: the client signs the user out on any 401
// (client/src/api/client.js), so answering 401 during a transient network blip
// would log every active user out at once.
const TOKEN_ERROR_CODES = new Set([
  'ERR_JWT_EXPIRED',
  'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JWT_INVALID',
  'ERR_JWS_INVALID',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JWKS_NO_MATCHING_KEY',
  'ERR_JOSE_ALG_NOT_ALLOWED',
]);

export function statusForVerifyError(err) {
  return TOKEN_ERROR_CODES.has(err?.code) ? 401 : 503;
}

export async function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const payload = await verifyAccessToken(token);
    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (statusForVerifyError(err) === 401) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('requireAuth: token verification unavailable:', err);
    return res.status(503).json({ error: 'Authentication temporarily unavailable' });
  }
}

// Remote verification — asks the Auth API about the token rather than trusting
// its signature, at the cost of the round trip requireAuth exists to avoid.
//
// Reserved for the operator console. A local check trusts a token until it
// expires, and on that surface a stale or leaked operator token reads every
// user's data and can suspend or delete them. The console is low-traffic, so
// paying a round trip there to make a demotion or a revoked operator take
// effect immediately is cheap.
//
// Note this does NOT make user suspension immediate — a suspended user isn't
// calling admin routes. See docs/ux-performance-roadmap.md (B1) for that
// window.
export async function requireAuthRemote(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
