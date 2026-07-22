import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Lazily create the service-role client (bypasses RLS) on first use. Building it
// at import time would throw whenever env vars are absent — e.g. in CI, where
// tests import pure helpers from DB-touching services but never hit the network.
// The proxy preserves fail-fast behavior: the first real `.from(...)`/`.auth`
// access without credentials still throws.
let client = null;

function getClient() {
  if (client) return client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  client = createClient(supabaseUrl, supabaseServiceKey);
  return client;
}

const supabase = new Proxy({}, {
  get(_target, prop) {
    const value = getClient()[prop];
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});

export default supabase;
