import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Module-level cache so the console gate and the Settings link don't each
// re-hit /admin/whoami. undefined = not yet checked; null = not an operator;
// 'support'|'admin' = role. Reset on sign-out via resetOperatorRole().
let cache;
let inflight;

export function resetOperatorRole() {
  cache = undefined;
  inflight = undefined;
}

// Returns { role, checked }. role is null for non-operators (whoami 403s,
// which the API layer surfaces as a thrown error — caught here, not a logout).
export function useOperatorRole() {
  const [role, setRole] = useState(cache ?? null);
  const [checked, setChecked] = useState(cache !== undefined);

  useEffect(() => {
    if (cache !== undefined) return;
    let cancelled = false;
    inflight = inflight || api.admin.whoami().then(
      (r) => { cache = r.role; return r.role; },
      () => { cache = null; return null; }
    );
    inflight.then((r) => {
      if (cancelled) return;
      setRole(r);
      setChecked(true);
    });
    return () => { cancelled = true; };
  }, []);

  return { role, checked };
}
