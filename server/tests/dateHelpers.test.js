import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, format } from 'date-fns';
import { parseUSDate, toISODate, daysUntil, daysSince, advanceByMonths } from '../utils/dateHelpers.js';

test('parseUSDate handles M/d/yyyy, M/d/yy, and ISO', () => {
  assert.equal(toISODate(parseUSDate('7/4/2026')), '2026-07-04');
  assert.equal(toISODate(parseUSDate('7/4/26')), '2026-07-04');
  assert.equal(toISODate(parseUSDate('2026-07-04')), '2026-07-04');
});

test('parseUSDate returns null for garbage', () => {
  assert.equal(parseUSDate('not a date'), null);
  assert.equal(parseUSDate(''), null);
  assert.equal(parseUSDate(null), null);
});

test('daysUntil is 0 for today, positive for future, negative for past', () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  assert.equal(daysUntil(today), 0);
  assert.equal(daysUntil(format(addDays(new Date(), 5), 'yyyy-MM-dd')), 5);
  assert.equal(daysUntil(format(addDays(new Date(), -5), 'yyyy-MM-dd')), -5);
  assert.equal(daysUntil(null), null);
});

test('daysSince mirrors daysUntil', () => {
  assert.equal(daysSince(format(addDays(new Date(), -10), 'yyyy-MM-dd')), 10);
  assert.equal(daysSince(null), null);
});

test('advanceByMonths adds calendar months', () => {
  assert.equal(advanceByMonths('2026-01-15', 6), '2026-07-15');
  assert.equal(advanceByMonths('2026-01-31', 1), '2026-02-28');
});
