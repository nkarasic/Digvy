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
      const digest = buildDigest(userItems);
      if (digest.total === 0) {
        results.skipped.push({ userId, reason: 'nothing due' });
        continue;
      }

      const prefs = await getPrefs(userId, { createIfMissing: !dryRun });
      if (prefs && !prefs.digest_enabled) {
        results.skipped.push({ userId, reason: 'unsubscribed' });
        continue;
      }

      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (userErr || !email) {
        results.skipped.push({ userId, reason: 'no email address' });
        continue;
      }

      const appUrl = APP_URL();
      const token = prefs?.unsubscribe_token || '(created-on-send)';
      const rendered = renderDigestEmail(digest, {
        appUrl,
        unsubscribeUrl: `${appUrl}/api/email/unsubscribe?token=${token}`,
      });

      if (dryRun) {
        results.sent.push({ userId, email, subject: rendered.subject, text: rendered.text });
      } else {
        await sendEmail({ to: email, ...rendered });
        results.sent.push({ userId, email, subject: rendered.subject });
      }
    } catch (err) {
      results.errors.push({ userId, error: err.message });
    }
  }

  return results;
}
