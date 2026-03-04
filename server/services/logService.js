import db from '../db.js';
import { nanoid } from 'nanoid';
import { advanceByMonths, toISODate } from '../utils/dateHelpers.js';

export async function addLog(itemId, logData) {
  await db.read();
  const item = db.data.items.find(i => i.id === itemId);
  if (!item) return null;

  const log = {
    id: nanoid(),
    date: logData.date || toISODate(new Date()),
    time: logData.time || null,
    price_paid: logData.price_paid != null ? Number(logData.price_paid) : null,
    note: logData.note || '',
  };

  item.logs.push(log);

  // Auto-advance next_date for Interval items
  if (item.logic_type === 'Interval' && item.interval_months) {
    item.next_date = advanceByMonths(log.date, item.interval_months);
    // Reset to flexible — the new target date is approximate again
    item.date_type = 'flexible';
    // booking_lead_days is preserved (learned lead time carries forward)
  }

  // Clear snooze when logging
  item.snoozed_until = null;

  await db.write();
  return { log, item };
}

export async function snooze(itemId, snoozedUntil) {
  await db.read();
  const item = db.data.items.find(i => i.id === itemId);
  if (!item) return null;

  item.snoozed_until = snoozedUntil;
  await db.write();
  return item;
}
