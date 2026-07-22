import supabase from '../db.js';
import { daysUntil, daysSince, addMonths, toISODate } from '../utils/dateHelpers.js';

// Pure aggregation, split out so it's testable without the database.
// `months` defaults to 12 (annual); pass 0 (or a falsy value) for all-time.
// A dated cutoff excludes older logs; undated logs can't be placed in time,
// so they only count in the all-time view. `now` is injectable for tests.
export function computeSpendByCategory(items, months = 12, now = new Date()) {
  const cutoff = months > 0 ? toISODate(addMonths(now, -months)) : null;

  const spend = {};
  for (const item of items || []) {
    for (const log of item.logs || []) {
      if (log.price_paid == null || log.price_paid <= 0) continue;
      // ISO date strings compare correctly with a lexicographic <.
      if (cutoff && (!log.date || log.date < cutoff)) continue;
      const cat = item.category || 'Uncategorized';
      spend[cat] = (spend[cat] || 0) + Number(log.price_paid);
    }
  }

  return Object.entries(spend)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

export async function getSpendByCategory(userId, months = 12) {
  const { data: items, error } = await supabase
    .from('items')
    .select('category, logs(price_paid, date)')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  return computeSpendByCategory(items, months);
}

export async function getUpcomingCosts(userId, days = 90) {
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, category, status, next_date, is_evergreen, logs(price_paid, date)')
    .eq('user_id', userId)
    .eq('status', 'Active');

  if (error) throw new Error(error.message);

  const upcoming = [];
  for (const item of items) {
    if (!item.next_date || item.is_evergreen) continue;

    const du = daysUntil(item.next_date);
    if (du === null || du < 0 || du > days) continue;

    const prices = (item.logs || [])
      .filter(l => l.price_paid != null && Number(l.price_paid) > 0)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(l => Number(l.price_paid));
    const lastPrice = prices.length > 0 ? prices[prices.length - 1] : null;

    if (lastPrice) {
      upcoming.push({
        id: item.id,
        name: item.name,
        category: item.category,
        next_date: item.next_date,
        days_until: du,
        estimated_cost: lastPrice,
      });
    }
  }

  return upcoming.sort((a, b) => a.days_until - b.days_until);
}

export async function getSubscriptionSummary(userId) {
  const { data: subs, error } = await supabase
    .from('items')
    .select('id, name, status, next_date, interval_months, logs(price_paid, date)')
    .eq('user_id', userId)
    .eq('category', 'Subscription');

  if (error) throw new Error(error.message);

  const active = subs.filter(i => i.status === 'Active');
  const inactive = subs.filter(i => i.status === 'Inactive');

  let totalAnnualCost = 0;
  for (const item of active) {
    const prices = (item.logs || [])
      .filter(l => l.price_paid != null && Number(l.price_paid) > 0)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(l => Number(l.price_paid));
    if (prices.length > 0) {
      const lastPrice = prices[prices.length - 1];
      const interval = item.interval_months || 12;
      totalAnnualCost += lastPrice * (12 / interval);
    }
  }

  return {
    active_count: active.length,
    inactive_count: inactive.length,
    total_count: subs.length,
    estimated_annual_cost: Math.round(totalAnnualCost * 100) / 100,
    active_subs: active.map(i => {
      const prices = (i.logs || [])
        .filter(l => l.price_paid != null && Number(l.price_paid) > 0)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map(l => Number(l.price_paid));
      return {
        id: i.id,
        name: i.name,
        next_date: i.next_date,
        last_price: prices.length > 0 ? prices[prices.length - 1] : null,
      };
    }),
  };
}

export async function getIntervalStats(userId) {
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, category, logs(date)')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const results = [];
  for (const item of items) {
    if (item.logs && item.logs.length >= 2) {
      const dates = item.logs
        .map(l => l.date)
        .filter(Boolean)
        .sort();
      if (dates.length >= 2) {
        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
          const diff = daysSince(dates[i - 1]) - daysSince(dates[i]);
          totalDays += Math.abs(diff);
        }
        const avgDays = Math.round(totalDays / (dates.length - 1));
        results.push({
          id: item.id,
          name: item.name,
          category: item.category,
          log_count: item.logs.length,
          avg_interval_days: avgDays,
        });
      }
    }
  }

  return results.sort((a, b) => a.avg_interval_days - b.avg_interval_days);
}
