import db from '../db.js';
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

export async function getAll(filters = {}) {
  await db.read();
  let items = db.data.items;

  if (filters.status) {
    items = items.filter(i => i.status === filters.status);
  }

  if (filters.dashboard) {
    // Only active items
    items = items.filter(i => i.status === 'Active');

    const action_required = [];
    const no_upcoming = [];

    for (const item of items) {
      const enriched = enrichItem(item);

      // Items with next_date="never" don't appear on dashboard
      if (item.next_date === 'never') continue;

      if (enriched.urgency) {
        action_required.push(enriched);
      } else {
        no_upcoming.push(enriched);
      }
    }

    // Sort action_required by urgency days ascending (most urgent first)
    action_required.sort((a, b) => (a.urgency?.days ?? Infinity) - (b.urgency?.days ?? Infinity));

    // Sort no_upcoming by days_since_last descending (longest ago first)
    no_upcoming.sort((a, b) => (b.days_since_last ?? -1) - (a.days_since_last ?? -1));

    return { action_required, no_upcoming };
  }

  return items.map(enrichItem);
}

export async function getById(id) {
  await db.read();
  const item = db.data.items.find(i => i.id === id);
  return item ? enrichItem(item) : null;
}

export async function create(data) {
  await db.read();
  const item = {
    id: nanoid(),
    name: data.name || '',
    category: data.category || '',
    status: data.status || 'Active',
    logic_type: data.logic_type || 'Fixed',
    interval_months: data.interval_months || null,
    next_date: data.next_date || null,
    cancel_by_date: data.cancel_by_date || null,
    details: data.details || '',
    link_url: data.link_url || null,
    date_type: data.date_type || 'firm',
    booking_lead_days: data.booking_lead_days != null ? Number(data.booking_lead_days) : 21,
    snoozed_until: null,
    logs: data.logs || [],
    created_at: new Date().toISOString(),
  };
  db.data.items.push(item);
  await db.write();
  return enrichItem(item);
}

export async function update(id, data) {
  await db.read();
  const idx = db.data.items.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const existing = db.data.items[idx];

  // Capture booking lead time when transitioning flexible → firm
  if (existing.date_type === 'flexible' && data.date_type === 'firm' && existing.next_date && existing.next_date !== 'never') {
    const leadDays = daysUntil(existing.next_date);
    if (leadDays !== null) {
      data.booking_lead_days = Math.max(0, leadDays);
    }
  }

  const updated = { ...existing, ...data, id: existing.id, logs: existing.logs };

  // Allow updating logs only through log endpoints
  if (data.logs) updated.logs = data.logs;

  db.data.items[idx] = updated;
  await db.write();
  return enrichItem(updated);
}

export async function remove(id) {
  await db.read();
  const idx = db.data.items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  db.data.items.splice(idx, 1);
  await db.write();
  return true;
}

export async function getCategories() {
  await db.read();
  const cats = new Set(db.data.items.map(i => i.category).filter(Boolean));
  return [...cats].sort();
}

export async function bulkCreate(items) {
  await db.read();
  const created = items.map(data => ({
    id: nanoid(),
    name: data.name || '',
    category: data.category || '',
    status: data.status || 'Active',
    logic_type: data.logic_type || 'Fixed',
    interval_months: data.interval_months || null,
    next_date: data.next_date || null,
    cancel_by_date: data.cancel_by_date || null,
    details: data.details || '',
    link_url: data.link_url || null,
    date_type: data.date_type || 'firm',
    booking_lead_days: data.booking_lead_days != null ? Number(data.booking_lead_days) : 21,
    snoozed_until: null,
    logs: data.logs || [],
    created_at: new Date().toISOString(),
  }));
  db.data.items.push(...created);
  await db.write();
  return created.map(enrichItem);
}
