import supabase from '../db.js';
import { nanoid } from 'nanoid';
import { advanceByMonths, toISODate } from '../utils/dateHelpers.js';
import { getById } from './itemService.js';

export async function addLog(userId, itemId, logData) {
  // Verify item exists and belongs to user
  const { data: item, error: fetchErr } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !item) return null;

  const log = {
    id: nanoid(),
    item_id: itemId,
    user_id: userId,
    date: logData.date || toISODate(new Date()),
    time: logData.time || null,
    price_paid: logData.price_paid != null ? Number(logData.price_paid) : null,
    note: logData.note || '',
  };

  const { error: logErr } = await supabase.from('logs').insert(log);
  if (logErr) throw new Error(logErr.message);

  // Logging clears any active snooze, then reschedules the item.
  const updates = { snoozed_until: null };
  if (logData.set_next) {
    // Caller explicitly set up the next occurrence in the same action.
    const evergreen = logData.is_evergreen === true;
    updates.is_evergreen = evergreen;
    updates.next_date = evergreen ? null : (logData.next_date || null);
    updates.cancel_by_date = logData.cancel_by_date || null;
    if (logData.date_type) updates.date_type = logData.date_type;
  } else if (item.logic_type === 'Interval' && item.interval_months) {
    // Legacy auto-advance for Interval items when no explicit schedule sent.
    updates.next_date = advanceByMonths(log.date, item.interval_months);
    updates.date_type = 'flexible';
    updates.is_evergreen = false;
  }

  const { error: updateErr } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .eq('user_id', userId);

  if (updateErr) throw new Error(updateErr.message);

  const updatedItem = await getById(userId, itemId);
  return { log, item: updatedItem };
}

export async function snooze(userId, itemId, snoozedUntil) {
  const { data, error } = await supabase
    .from('items')
    .update({ snoozed_until: snoozedUntil })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  return getById(userId, itemId);
}
