import supabase from '../db.js';
import { getAll as getItemsForUser } from './itemService.js';
import { runDigestForUser } from './digestService.js';

// Operator role for a user, or null if they have no console access.
export async function getRole(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? data.role : null;
}

// Append a row to the operator audit log. Called after a mutating admin
// action succeeds, in the same request.
export async function logAudit({ actorId, action, targetUserId = null, payload = null }) {
  const { error } = await supabase
    .from('admin_audit')
    .insert({
      actor_id: actorId,
      action,
      target_user_id: targetUserId,
      payload,
    });
  if (error) throw new Error(error.message);
}

// Identity lives in Supabase Auth, not a local table, so pull the full user
// list from the auth admin API. Paged; capped so a runaway never loops forever.
async function listAllAuthUsers() {
  const all = [];
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < perPage) break;
  }
  return all;
}

async function tableCount(table, filters = {}) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [col, val] of Object.entries(filters)) query = query.eq(col, val);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Real digest sends and errors over the last 24h. Best-effort: returns zeros
// if digest_runs isn't migrated yet.
async function digest24h() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('digest_runs')
      .select('sent, errors')
      .eq('dry_run', false)
      .gte('ran_at', since);
    if (error) throw error;
    return {
      digests_sent_24h: (data || []).reduce((s, r) => s + (r.sent || 0), 0),
      digest_errors_24h: (data || []).reduce((s, r) => s + (r.errors || 0), 0),
    };
  } catch {
    return { digests_sent_24h: 0, digest_errors_24h: 0 };
  }
}

// Fleet-wide totals for the dashboard.
export async function getMetrics() {
  const [users, items, activeItems, logs, operators, digest] = await Promise.all([
    listAllAuthUsers(),
    tableCount('items'),
    tableCount('items', { status: 'Active' }),
    tableCount('logs'),
    tableCount('admin_users'),
    digest24h(),
  ]);
  return {
    users: users.length,
    operators,
    items,
    active_items: activeItems,
    logs,
    ...digest,
  };
}

// User list for search, enriched with per-user item counts, digest state, and
// operator role. Optional case-insensitive email substring filter.
export async function listUsers(q) {
  let users = await listAllAuthUsers();
  if (q) {
    const needle = q.toLowerCase();
    users = users.filter((u) => (u.email || '').toLowerCase().includes(needle));
  }

  const [{ data: items, error: itemErr }, { data: prefs }, { data: ops }] = await Promise.all([
    supabase.from('items').select('user_id, status'),
    supabase.from('email_preferences').select('user_id, digest_enabled'),
    supabase.from('admin_users').select('user_id, role'),
  ]);
  if (itemErr) throw new Error(itemErr.message);

  const counts = new Map();
  for (const it of items || []) {
    const c = counts.get(it.user_id) || { total: 0, active: 0 };
    c.total++;
    if (it.status === 'Active') c.active++;
    counts.set(it.user_id, c);
  }
  const prefMap = new Map((prefs || []).map((p) => [p.user_id, p.digest_enabled]));
  const roleMap = new Map((ops || []).map((o) => [o.user_id, o.role]));

  return users
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed: !!u.email_confirmed_at,
      item_count: counts.get(u.id)?.total || 0,
      active_item_count: counts.get(u.id)?.active || 0,
      digest_enabled: prefMap.has(u.id) ? prefMap.get(u.id) : true,
      role: roleMap.get(u.id) || null,
    }));
}

// Full detail for one user, or null if the id doesn't exist. The auth admin
// API errors (rather than returning a null user) for an unknown id, so treat
// any lookup failure as "not found" and let the route answer 404.
export async function getUserDetail(id) {
  const { data, error } = await supabase.auth.admin.getUserById(id);
  const user = data?.user;
  if (error || !user) return null;

  const [itemCount, activeItemCount, logCount, role] = await Promise.all([
    tableCount('items', { user_id: id }),
    tableCount('items', { user_id: id, status: 'Active' }),
    tableCount('logs', { user_id: id }),
    getRole(id),
  ]);
  const { data: prefs } = await supabase
    .from('email_preferences')
    .select('digest_enabled, unsubscribe_token, updated_at')
    .eq('user_id', id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed: !!user.email_confirmed_at,
    banned_until: user.banned_until ?? null,
    role,
    item_count: itemCount,
    active_item_count: activeItemCount,
    log_count: logCount,
    digest_enabled: prefs ? prefs.digest_enabled : true,
    has_prefs_row: !!prefs,
  };
}

// Read-only enriched item list for a user (reuses the same shape the app uses).
export async function getUserItems(id) {
  return getItemsForUser(id);
}

// Recent logs for a user, joined to their item's name/category.
export async function getUserLogs(id, limit = 100) {
  const { data, error } = await supabase
    .from('logs')
    .select('*, items(name, category)')
    .eq('user_id', id)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

// Most-recent audit entries, with actor/target emails resolved for display.
export async function listAudit({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('admin_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const ids = [...new Set(data.flatMap((r) => [r.actor_id, r.target_user_id]).filter(Boolean))];
  const emailMap = new Map();
  await Promise.all(
    ids.map(async (uid) => {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user) emailMap.set(uid, u.user.email);
    })
  );

  return data.map((r) => ({
    ...r,
    actor_email: emailMap.get(r.actor_id) || null,
    target_email: r.target_user_id ? emailMap.get(r.target_user_id) || null : null,
  }));
}

// --- Phase 3: safe mutating actions (all audited) ---

// Resend (or dry-run preview) the digest for one user. Honors the same
// unsubscribe/nothing-due checks as the nightly job.
export async function resendDigest({ actorId, userId, dryRun = false }) {
  const results = await runDigestForUser(userId, { dryRun, actorId });
  await logAudit({
    actorId,
    action: dryRun ? 'digest.preview' : 'digest.resend',
    targetUserId: userId,
    payload: {
      sent: results.sent.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
    },
  });
  return results;
}

// Toggle a user's digest preference on their behalf.
export async function setUserDigestEnabled({ actorId, userId, enabled }) {
  const { error } = await supabase
    .from('email_preferences')
    .upsert(
      { user_id: userId, digest_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw new Error(error.message);
  await logAudit({
    actorId,
    action: 'preferences.digest_toggle',
    targetUserId: userId,
    payload: { digest_enabled: enabled },
  });
  return { digest_enabled: enabled };
}

// Trigger a Supabase password-reset email to a user. Returns null if the user
// doesn't exist (route answers 404).
export async function sendPasswordReset({ actorId, userId }) {
  const detail = await getUserDetail(userId);
  if (!detail) return null;

  const redirectTo = process.env.APP_URL || 'https://digvy.vercel.app';
  const { error } = await supabase.auth.resetPasswordForEmail(detail.email, { redirectTo });
  if (error) throw new Error(error.message);

  await logAudit({
    actorId,
    action: 'password_reset.send',
    targetUserId: userId,
    payload: { email: detail.email },
  });
  return { sent: true, email: detail.email };
}

// Recent digest runs (nightly + admin resends) for the email-ops screen.
export async function listDigestRuns(limit = 25) {
  const { data, error } = await supabase
    .from('digest_runs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}
