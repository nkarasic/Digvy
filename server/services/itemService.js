import supabase from '../db.js';
import { nanoid } from 'nanoid';
import { computeUrgency } from './urgencyService.js';
import { daysSince, daysUntil } from '../utils/dateHelpers.js';

function enrichItem(item) {
  const urgency = computeUrgency(item);
  const lastLog = item.logs && item.logs.length > 0
    ? item.logs[item.logs.length - 1]
    : null;
  const days_since_last = lastLog ? daysSince(lastLog.date) : null;
  return { ...item, urgency, days_since_last };
}

async function fetchItemsWithLogs(userId, extraFilters = {}) {
  let query = supabase
    .from('items')
    .select('*, logs(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (extraFilters.status) {
    query = query.eq('status', extraFilters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Sort logs by date within each item
  for (const item of data) {
    if (item.logs) {
      item.logs.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''));
    }
  }

  return data;
}

export async function getAll(userId, filters = {}) {
  let items = await fetchItemsWithLogs(userId, { status: filters.status });

  if (filters.dashboard) {
    items = items.filter(i => i.status === 'Active');

    const action_required = [];
    const no_upcoming = [];

    for (const item of items) {
      const enriched = enrichItem(item);

      if (item.is_evergreen) continue;

      if (enriched.urgency) {
        action_required.push(enriched);
      } else {
        no_upcoming.push(enriched);
      }
    }

    action_required.sort((a, b) => (a.urgency?.days ?? Infinity) - (b.urgency?.days ?? Infinity));
    no_upcoming.sort((a, b) => (b.days_since_last ?? -1) - (a.days_since_last ?? -1));

    return { action_required, no_upcoming };
  }

  return items.map(enrichItem);
}

export async function getById(userId, id) {
  const { data, error } = await supabase
    .from('items')
    .select('*, logs(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;

  if (data.logs) {
    data.logs.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''));
  }

  return enrichItem(data);
}

// Empty strings and the legacy 'never' sentinel are not valid DATE values
function normalizeDate(value) {
  if (!value || value === 'never') return null;
  return value;
}

export async function create(userId, data) {
  const itemId = nanoid();

  const isEvergreen = data.is_evergreen === true || data.next_date === 'never';

  const item = {
    id: itemId,
    user_id: userId,
    name: data.name || '',
    category: data.category || '',
    status: data.status || 'Active',
    logic_type: data.logic_type || 'Fixed',
    interval_months: data.interval_months || null,
    billing_period_months: data.billing_period_months || null,
    is_evergreen: isEvergreen,
    next_date: isEvergreen ? null : normalizeDate(data.next_date),
    cancel_by_date: normalizeDate(data.cancel_by_date),
    details: data.details || '',
    link_url: data.link_url || null,
    date_type: data.date_type || 'firm',
    booking_lead_days: data.booking_lead_days != null ? Number(data.booking_lead_days) : 21,
    snoozed_until: null,
  };

  const { error: itemError } = await supabase.from('items').insert(item);
  if (itemError) throw new Error(itemError.message);

  // Insert initial logs if provided (e.g., from CSV import)
  const logs = data.logs || [];
  if (logs.length > 0) {
    const logRows = logs.map(l => ({
      id: nanoid(),
      item_id: itemId,
      user_id: userId,
      date: l.date || '',
      time: l.time || null,
      price_paid: l.price_paid != null ? Number(l.price_paid) : null,
      note: l.note || '',
    }));
    const { error: logError } = await supabase.from('logs').insert(logRows);
    if (logError) throw new Error(logError.message);
  }

  return getById(userId, itemId);
}

export async function update(userId, id, data) {
  // Fetch existing to check ownership and handle transitions
  const { data: existing, error: fetchErr } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !existing) return null;

  // Normalize date fields and the legacy 'never' sentinel
  if ('next_date' in data || 'is_evergreen' in data) {
    const isEvergreen = data.is_evergreen === true || data.next_date === 'never';
    data.is_evergreen = isEvergreen;
    data.next_date = isEvergreen ? null : normalizeDate(data.next_date);
  }
  if ('cancel_by_date' in data) data.cancel_by_date = normalizeDate(data.cancel_by_date);
  if ('snoozed_until' in data) data.snoozed_until = normalizeDate(data.snoozed_until);

  // Capture booking lead time when transitioning flexible → firm
  if (existing.date_type === 'flexible' && data.date_type === 'firm' && existing.next_date) {
    const leadDays = daysUntil(existing.next_date);
    if (leadDays !== null) {
      data.booking_lead_days = Math.max(0, leadDays);
    }
  }

  // Ensure NOT NULL fields have defaults
  if (data.booking_lead_days == null) data.booking_lead_days = existing.booking_lead_days ?? 21;

  // Remove fields that shouldn't be updated directly
  const { logs, id: _id, user_id, ...updateData } = data;

  const { error: updateErr } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId);

  if (updateErr) throw new Error(updateErr.message);

  return getById(userId, id);
}

export async function remove(userId, id) {
  const { data, error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) throw new Error(error.message);
  return data && data.length > 0;
}

export async function getCategories(userId) {
  const { data, error } = await supabase
    .from('items')
    .select('category')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const cats = new Set(data.map(i => i.category).filter(Boolean));
  return [...cats].sort();
}

export async function bulkCreate(userId, items) {
  const results = [];
  for (const data of items) {
    const item = await create(userId, data);
    results.push(item);
  }
  return results;
}
