// Pure digest logic — no database or network imports, so tests (and CI,
// which has no Supabase env) can use it directly. Orchestration lives in
// digestService.js.
import { computeUrgency } from './urgencyService.js';
import { formatDate } from '../utils/dateHelpers.js';

const DUE_SOON_DAYS = 7;

// Raw item rows → { overdue, dueSoon, total }. Skips inactive, evergreen,
// snoozed, and anything not due within DUE_SOON_DAYS.
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

// digest → { subject, html, text } with unsubscribe footer.
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
