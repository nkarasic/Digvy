import { parse } from 'csv-parse/sync';
import { parseUSDate, toISODate, daysUntil } from '../utils/dateHelpers.js';

// Extract first $X.XX from text
function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(',', ''));
}

// Extract time patterns like "8:40 AM", "Noon - 2pm", "10:15 AM", "1:00 PM"
function extractTime(text) {
  if (!text) return null;
  // Match "Noon - 2pm" style
  const noonMatch = text.match(/\b(Noon\s*-\s*\d+\s*(?:pm|am)?)\b/i);
  if (noonMatch) return noonMatch[1];
  // Match "8:40 AM" style
  const timeMatch = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/);
  if (timeMatch) return timeMatch[1];
  return null;
}

// Extract "cancel before/by DATE" → cancel_by_date
function extractCancelByDate(text) {
  if (!text) return null;
  const match = text.match(/cancel\s+(?:by|before)\s+(?:end\s+of\s+)?(?:promo\s+period|(\d{1,2}\/\d{1,2}\/\d{2,4}))/i);
  if (match && match[1]) {
    const d = parseUSDate(match[1]);
    return d ? toISODate(d) : null;
  }
  return null;
}

// Check if text indicates cancellation (but NOT "cancel by/before")
function isCancelled(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  // Check for "cancelled", "canceled", but exclude "cancel by", "cancel before", "cancel recurring"
  if (/\bcancell?ed\b/.test(lower)) return true;
  return false;
}

function inferStatus(name, category, lastDate, nextDateStr, notes) {
  // Check notes for cancellation
  if (isCancelled(notes)) return 'Inactive';
  // Check name for cancellation
  if (isCancelled(name)) return 'Inactive';

  const lower = (nextDateStr || '').toLowerCase().trim();

  // "never" / "never expire"
  if (lower === 'never' || lower === 'never expire') return 'Active';

  // Has a next date
  if (nextDateStr && nextDateStr.trim()) {
    const parsed = parseUSDate(nextDateStr);
    if (parsed) return 'Active'; // Even if overdue, it's active
  }

  // No next date
  if (!lastDate && !nextDateStr?.trim()) return 'Historical';

  // Has last date but no next date → Active (trackable)
  return 'Active';
}

function inferLogicType(nextDateStr, lastDate) {
  const lower = (nextDateStr || '').toLowerCase().trim();
  if (lower === 'never' || lower === 'never expire') return 'Fixed';
  if (!nextDateStr?.trim() && !lastDate) return 'Reference';
  return 'Fixed'; // Default; user can change to Interval later
}

export function parseCSV(csvContent) {
  const records = parse(csvContent, {
    skip_empty_lines: false,
    relax_column_count: true,
  });

  if (records.length === 0) return [];

  // First row is headers — skip it
  const rows = records.slice(1);
  const items = [];

  for (const row of rows) {
    const name = (row[0] || '').trim();
    if (!name) continue; // Skip empty rows

    const category = (row[1] || '').trim();
    const lastTimeStr = (row[2] || '').trim();
    // row[3] = "Days since last" — skip
    const nextTimeStr = (row[4] || '').trim();
    // row[5] = "Days until next" — skip
    const notes = (row[6] || '').trim();

    const lastDate = parseUSDate(lastTimeStr);
    const status = inferStatus(name, category, lastDate, nextTimeStr, notes);
    const logicType = inferLogicType(nextTimeStr, lastDate);

    // Parse next_date
    let next_date = null;
    const nextLower = nextTimeStr.toLowerCase().trim();
    if (nextLower === 'never' || nextLower === 'never expire') {
      next_date = 'never';
    } else if (nextTimeStr) {
      const nd = parseUSDate(nextTimeStr);
      if (nd) next_date = toISODate(nd);
    }

    // Extract cancel_by_date from notes
    let cancel_by_date = extractCancelByDate(notes);

    // Also check for "cancel before DATE" patterns with actual dates in notes
    if (!cancel_by_date && notes) {
      // Pattern: "cancel before 9/18/2026" or "cancel recurring billing before"
      const cancelMatch = notes.match(/cancel\s+(?:recurring\s+billing\s+)?before\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      if (cancelMatch) {
        const cd = parseUSDate(cancelMatch[1]);
        if (cd) cancel_by_date = toISODate(cd);
      }
    }

    // Check for dates in notes that might indicate cancel_by_date
    // e.g., "Subscription ends 7/28/2026; cancel recurring billing before"
    if (!cancel_by_date && notes) {
      const endsMatch = notes.match(/(?:ends|expires)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      if (endsMatch && /cancel/i.test(notes)) {
        const cd = parseUSDate(endsMatch[1]);
        if (cd) cancel_by_date = toISODate(cd);
      }
    }

    // "Cancel by end of promo period" — use next_date as cancel_by_date
    if (!cancel_by_date && notes && /cancel\s+by\s+end\s+of\s+promo/i.test(notes)) {
      cancel_by_date = next_date !== 'never' ? next_date : null;
    }

    // Extract price and time from notes
    const price = extractPrice(notes);
    const time = extractTime(notes);

    // Build initial log entry from Last time
    const logs = [];
    if (lastDate) {
      logs.push({
        date: toISODate(lastDate),
        time: time,
        price_paid: price,
        note: notes || '',
      });
    }

    // Build details from notes (clean version — strip price/time/cancel patterns for details)
    const details = notes;

    const item = {
      name,
      category,
      status,
      logic_type: logicType,
      interval_months: null,
      next_date,
      cancel_by_date,
      details,
      link_url: null,
      logs,
    };

    // Add warnings for triage
    const warnings = [];
    if (status === 'Active' && next_date && next_date !== 'never') {
      const days = daysUntil(next_date);
      if (days !== null && days < 0) {
        warnings.push(`Overdue by ${Math.abs(days)} days`);
      }
    }
    if (status === 'Inactive') {
      warnings.push('Detected as cancelled/inactive');
    }
    if (!lastDate && !next_date) {
      warnings.push('No dates found — classified as Historical');
    }

    items.push({ ...item, _warnings: warnings });
  }

  return items;
}
