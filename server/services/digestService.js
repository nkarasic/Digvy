import supabase from '../db.js';
import { nanoid } from 'nanoid';
import { buildDigest, renderDigestEmail } from './digestBuilder.js';
import { sendEmail } from './emailService.js';

export { buildDigest, renderDigestEmail };

const APP_URL = () => process.env.APP_URL || 'https://digvy.vercel.app';

async function getPrefs(userId, { createIfMissing }) {
  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data || !createIfMissing) return data;

  const row = { user_id: userId, digest_enabled: true, unsubscribe_token: nanoid(32) };
  const { data: inserted, error: insertErr } = await supabase
    .from('email_preferences')
    .upsert(row, { onConflict: 'user_id', ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (insertErr) throw new Error(insertErr.message);
  if (inserted) return inserted;

  // Upsert ignored a concurrent insert — fetch the winner
  const { data: existing, error: refetchErr } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (refetchErr) throw new Error(refetchErr.message);
  return existing;
}

// Builds and (unless dryRun) sends the digest for a single user. Returns a
// tagged result; the caller aggregates. Throwing is reserved for genuine
// failures (send errors) — expected non-sends return status 'skipped'.
async function buildAndSend(userId, userItems, { dryRun }) {
  const digest = buildDigest(userItems);
  if (digest.total === 0) return { userId, status: 'skipped', reason: 'nothing due' };

  const prefs = await getPrefs(userId, { createIfMissing: !dryRun });
  if (prefs && !prefs.digest_enabled) return { userId, status: 'skipped', reason: 'unsubscribed' };

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userErr || !email) return { userId, status: 'skipped', reason: 'no email address' };

  const appUrl = APP_URL();
  const token = prefs?.unsubscribe_token || '(created-on-send)';
  const rendered = renderDigestEmail(digest, {
    appUrl,
    unsubscribeUrl: `${appUrl}/api/email/unsubscribe?token=${token}`,
  });

  if (dryRun) return { userId, status: 'sent', email, subject: rendered.subject, text: rendered.text };
  await sendEmail({ to: email, ...rendered });
  return { userId, status: 'sent', email, subject: rendered.subject };
}

function collect(results, r) {
  if (r.status === 'sent') {
    const { status, ...entry } = r;
    results.sent.push(entry);
  } else {
    results.skipped.push({ userId: r.userId, reason: r.reason });
  }
}

// Dry-run 'sent' entries carry the full email body; strip it so persisted rows
// stay small (subject/email are enough for support).
function sanitizeDetail({ sent, skipped, errors }) {
  return { sent: sent.map(({ text, ...rest }) => rest), skipped, errors };
}

// Persist a run for the console. Best-effort: a logging failure (e.g. the
// table not yet migrated) must never break the actual digest send.
async function recordDigestRun({ dryRun, scope, triggeredBy = null, results }) {
  try {
    await supabase.from('digest_runs').insert({
      dry_run: dryRun,
      scope,
      triggered_by: triggeredBy,
      sent: results.sent.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      detail: sanitizeDetail(results),
    });
  } catch (err) {
    console.error('Failed to record digest run:', err.message);
  }
}

// Queries all users' active items (service role bypasses RLS), builds a
// digest per user, and emails everyone who has due items and hasn't
// unsubscribed. dryRun renders without sending and creates no prefs rows.
export async function runDigest({ dryRun = false } = {}) {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'Active')
    .eq('is_evergreen', false);
  if (error) throw new Error(error.message);

  const byUser = new Map();
  for (const item of items) {
    if (!byUser.has(item.user_id)) byUser.set(item.user_id, []);
    byUser.get(item.user_id).push(item);
  }

  const results = { sent: [], skipped: [], errors: [], dryRun };

  for (const [userId, userItems] of byUser) {
    try {
      collect(results, await buildAndSend(userId, userItems, { dryRun }));
    } catch (err) {
      results.errors.push({ userId, error: err.message });
    }
  }

  await recordDigestRun({ dryRun, scope: 'all', results });
  return results;
}

// Same digest for a single user — used by the admin console's resend action.
// actorId is the operator triggering it (recorded on the run).
export async function runDigestForUser(userId, { dryRun = false, actorId = null } = {}) {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'Active')
    .eq('is_evergreen', false);
  if (error) throw new Error(error.message);

  const results = { sent: [], skipped: [], errors: [], dryRun };
  try {
    collect(results, await buildAndSend(userId, items || [], { dryRun }));
  } catch (err) {
    results.errors.push({ userId, error: err.message });
  }

  await recordDigestRun({ dryRun, scope: userId, triggeredBy: actorId, results });
  return results;
}
