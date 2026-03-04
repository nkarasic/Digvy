import db from '../db.js';
import { daysUntil, daysSince } from '../utils/dateHelpers.js';

export async function getSpendByCategory() {
  await db.read();
  const spend = {};

  for (const item of db.data.items) {
    for (const log of item.logs || []) {
      if (log.price_paid != null && log.price_paid > 0) {
        const cat = item.category || 'Uncategorized';
        spend[cat] = (spend[cat] || 0) + log.price_paid;
      }
    }
  }

  return Object.entries(spend)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

export async function getUpcomingCosts(days = 90) {
  await db.read();
  const upcoming = [];

  for (const item of db.data.items) {
    if (item.status !== 'Active') continue;
    if (!item.next_date || item.next_date === 'never') continue;

    const du = daysUntil(item.next_date);
    if (du === null || du < 0 || du > days) continue;

    // Find most recent price
    const prices = (item.logs || [])
      .filter(l => l.price_paid != null && l.price_paid > 0)
      .map(l => l.price_paid);
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

export async function getSubscriptionSummary() {
  await db.read();
  const subs = db.data.items.filter(i => i.category === 'Subscription');
  const active = subs.filter(i => i.status === 'Active');
  const inactive = subs.filter(i => i.status === 'Inactive');

  // Estimate annual cost from most recent price * frequency
  let totalAnnualCost = 0;
  for (const item of active) {
    const prices = (item.logs || [])
      .filter(l => l.price_paid != null && l.price_paid > 0)
      .map(l => l.price_paid);
    if (prices.length > 0) {
      const lastPrice = prices[prices.length - 1];
      // If we know the interval, annualize; otherwise assume annual
      const interval = item.interval_months || 12;
      totalAnnualCost += lastPrice * (12 / interval);
    }
  }

  return {
    active_count: active.length,
    inactive_count: inactive.length,
    total_count: subs.length,
    estimated_annual_cost: Math.round(totalAnnualCost * 100) / 100,
    active_subs: active.map(i => ({
      id: i.id,
      name: i.name,
      next_date: i.next_date,
      last_price: (() => {
        const prices = (i.logs || []).filter(l => l.price_paid != null && l.price_paid > 0).map(l => l.price_paid);
        return prices.length > 0 ? prices[prices.length - 1] : null;
      })(),
    })),
  };
}

export async function getIntervalStats() {
  await db.read();
  const results = [];

  for (const item of db.data.items) {
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
