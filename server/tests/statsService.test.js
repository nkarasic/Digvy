import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSpendByCategory } from '../services/statsService.js';

// Fixed "now" so the trailing-window cutoff is deterministic.
// 12-month cutoff from here is 2025-07-21.
const NOW = new Date('2026-07-21T12:00:00');

function item(category, logs) {
  return { category, logs };
}

test('annual window excludes logs older than the cutoff (the insurance case)', () => {
  const items = [
    item('Insurance', [
      { price_paid: 939, date: '2025-05-20' }, // before cutoff -> excluded
      { price_paid: 939, date: '2026-05-20' }, // within window -> counted
    ]),
  ];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), [
    { category: 'Insurance', total: 939 },
  ]);
});

test('all-time (months=0) includes every dated log', () => {
  const items = [
    item('Insurance', [
      { price_paid: 939, date: '2025-05-20' },
      { price_paid: 939, date: '2026-05-20' },
    ]),
  ];
  assert.deepEqual(computeSpendByCategory(items, 0, NOW), [
    { category: 'Insurance', total: 1878 },
  ]);
});

test('a log exactly on the cutoff date is included', () => {
  const items = [item('Home', [{ price_paid: 100, date: '2025-07-21' }])];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), [
    { category: 'Home', total: 100 },
  ]);
});

test('undated logs are excluded from a window but count in all-time', () => {
  const items = [item('Auto', [{ price_paid: 50, date: null }])];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), []);
  assert.deepEqual(computeSpendByCategory(items, 0, NOW), [
    { category: 'Auto', total: 50 },
  ]);
});

test('null, zero, and negative prices are ignored', () => {
  const items = [
    item('Health', [
      { price_paid: null, date: '2026-01-01' },
      { price_paid: 0, date: '2026-01-01' },
      { price_paid: -20, date: '2026-01-01' },
      { price_paid: 30, date: '2026-01-01' },
    ]),
  ];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), [
    { category: 'Health', total: 30 },
  ]);
});

test('missing category falls back to Uncategorized', () => {
  const items = [item(null, [{ price_paid: 10, date: '2026-01-01' }])];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), [
    { category: 'Uncategorized', total: 10 },
  ]);
});

test('results are summed per category and sorted by total descending', () => {
  const items = [
    item('A', [{ price_paid: 10, date: '2026-01-01' }]),
    item('B', [
      { price_paid: 40, date: '2026-01-01' },
      { price_paid: 5, date: '2026-02-01' },
    ]),
    item('A', [{ price_paid: 10, date: '2026-03-01' }]),
  ];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), [
    { category: 'B', total: 45 },
    { category: 'A', total: 20 },
  ]);
});

test('totals round to two decimals', () => {
  const items = [
    item('Subscription', [
      { price_paid: 9.99, date: '2026-01-01' },
      { price_paid: 9.99, date: '2026-02-01' },
      { price_paid: 9.99, date: '2026-03-01' },
    ]),
  ];
  assert.deepEqual(computeSpendByCategory(items, 12, NOW), [
    { category: 'Subscription', total: 29.97 },
  ]);
});

test('empty and missing inputs produce an empty result', () => {
  assert.deepEqual(computeSpendByCategory([], 12, NOW), []);
  assert.deepEqual(computeSpendByCategory(undefined, 12, NOW), []);
  assert.deepEqual(computeSpendByCategory([item('X', null)], 12, NOW), []);
});
