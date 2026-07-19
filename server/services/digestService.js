import supabase from '../db.js';
import { nanoid } from 'nanoid';
import { computeUrgency } from './urgencyService.js';
import { formatDate } from '../utils/dateHelpers.js';
import { sendEmail } from './emailService.js';

const DUE_SOON_DAYS = 7;

const APP_URL = () => process.env.APP_URL || 'https://digvy.vercel.app';

// Pure: raw item rows → { overdue, dueSoon, total }. Skips inactive,
// evergreen, snoozed, and anything not due within DUE_SOON_DAYS.
export function buildDigest(items) {
  const overdue = [];
  const dueSoon = [];

  for (const item of items) {
    if (item.is_evergreen) continue;

    const urgency = computeUrgency(item);
    if (!urgency || urgency.source === 'snooze') continue;
    if (urgency.days > DUE_SOON_DAYS) continue;

    const entry = {
      id: item.id,
      name: item.name,
      category: item.category,
      days: urgency.days,
      label: urgency.label,
      source: urgency.source,
      date: urgency.source === 'cancel' ? item.cancel_by_date : item.next_date,
    };

    (urgency.days < 0 ? overdue : dueSoon).push(entry);
  }

  overdue.sort((a, b) => a.days - b.days);
  dueSoon.sort((a, b) => a.days - b.days);

  return { overdue, dueSoon, total: overdue.length + dueSoon.length };
}

function describeEntry(entry) {
  const { days, source } = entry;
  const n = Math.abs(days);
  const unit = n === 1 ? 'day' : 'days';

  if (source === 'cancel') {
    if (days < 0) return `cancel-by date passed ${n} ${unit} ago`;
    if (days === 0) return 'cancel by today';
    return `cancel by ${formatDate(entry.date)} (${n} ${unit} left)`;
  }
  if (days < 0) return `${n} ${unit} overdue`;
  if (days === 0) return 'due today';
  return `due in ${n} ${unit}`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Pure: digest → { subject, html, text } with unsubscribe footer.
export function renderDigestEmail(digest, { appUrl, unsubscribeUrl }) {
  const parts = [];
  if (digest.overdue.length > 0) parts.push(`${digest.overdue.length} overdue`);
  if (digest.dueSoon.length > 0) parts.push(`${digest.dueSoon.length} due this week`);
  const subject = `Digvy: ${parts.join(', ')}`;

  const sectionHtml = (title, color, entries) => {
    if (entries.length === 0) return '';
    const rows = entries.map(e => `
      <tr>
        <td style="padding:6px 12px 6px 0;font-weight:600;">${escapeHtml(e.name)}</td>
        <td style="padding:6px 12px 6px 0;color:#6b7280;">${escapeHtml(e.category)}</td>
        <td style="padding:6px 0;color:${color};">${escapeHtml(describeEntry(e))}</td>
      </tr>`).join('');
    return `
      <h3 style="margin:20px 0 8px;color:${color};">${title}</h3>
      <table style="border-collapse:collapse;font-size:14px;">${rows}</table>`;
  };

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111827;">
    <h2 style="margin:0 0 4px;">Digvy daily digest</h2>
    <p style="margin:0;color:#6b7280;font-size:14px;">What needs your attention today.</p>
    ${sectionHtml('Overdue', '#dc2626', digest.overdue)}
    ${sectionHtml('Due this week', '#d97706', digest.dueSoon)}
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(appUrl)}" style="color:#2563eb;">Open Digvy</a>
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      You get this email because you have items due in Digvy.
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a>
    </p>
  </div>`;

  const sectionText = (title, entries) =>
    entries.length === 0
      ? ''
      : `${title}:\n${entries.map(e => `  - ${e.name}${e.category ? ` (${e.category})` : ''} — ${describeEntry(e)}`).join('\n')}\n\n`;

  const text =
    'Digvy daily digest\n\n' +
    sectionText('Overdue', digest.overdue) +
    sectionText('Due this week', digest.dueSoon) +
    `Open Digvy: ${appUrl}\n\nUnsubscribe: ${unsubscribeUrl}\n`;

  return { subject, html, text };
}

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
