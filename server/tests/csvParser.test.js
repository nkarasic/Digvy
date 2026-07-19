import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../services/csvParser.js';

const HEADER = 'Name,Category,Last time,Days since,Next time,Days until,Notes';

function csv(...rows) {
  return [HEADER, ...rows].join('\n');
}

test('parses a basic row with dates', () => {
  const [item] = parseCSV(csv('HVAC Filter,Home,1/15/2026,,7/15/2026,,Bought 20x25x1'));
  assert.equal(item.name, 'HVAC Filter');
  assert.equal(item.category, 'Home');
  assert.equal(item.status, 'Active');
  assert.equal(item.next_date, '2026-07-15');
  assert.equal(item.is_evergreen, false);
  assert.equal(item.logs.length, 1);
  assert.equal(item.logs[0].date, '2026-01-15');
});

test('skips rows with no name', () => {
  const items = parseCSV(csv(',Home,1/15/2026,,,,'));
  assert.equal(items.length, 0);
});

test('"never expire" becomes evergreen with null next_date', () => {
  const [item] = parseCSV(csv('Costco Card,Membership,1/1/2026,,never expire,,'));
  assert.equal(item.is_evergreen, true);
  assert.equal(item.next_date, null);
  assert.equal(item.status, 'Active');
});

test('"cancelled" in notes marks item Inactive but "cancel by" does not', () => {
  const items = parseCSV(csv(
    'Old Sub,Subscription,1/1/2026,,,,cancelled in March',
    'Trial,Subscription,1/1/2026,,6/1/2026,,cancel by 5/28/2026'
  ));
  assert.equal(items[0].status, 'Inactive');
  assert.deepEqual(items[0]._warnings, ['Detected as cancelled/inactive']);
  assert.equal(items[1].status, 'Active');
});

test('extracts price and time from notes', () => {
  const [item] = parseCSV(csv('Dentist,Health,3/10/2026,,9/10/2026,,"Paid $189.50, appt at 8:40 AM"'));
  assert.equal(item.logs[0].price_paid, 189.5);
  assert.equal(item.logs[0].time, '8:40 AM');
});

test('extracts cancel-before date from notes', () => {
  const [item] = parseCSV(csv('Streaming,Subscription,1/1/2026,,8/1/2026,,cancel before 7/28/2026'));
  assert.equal(item.cancel_by_date, '2026-07-28');
});

test('no dates at all classifies as Historical with warning', () => {
  const [item] = parseCSV(csv('Fridge Manual,Reference,,,,,'));
  assert.equal(item.status, 'Historical');
  assert.ok(item._warnings.includes('No dates found — classified as Historical'));
});

test('overdue active items get an overdue warning', () => {
  const [item] = parseCSV(csv('Oil Change,Car,1/1/2020,,1/1/2021,,'));
  assert.ok(item._warnings.some(w => w.startsWith('Overdue by ')));
});

test('empty input returns empty array', () => {
  assert.deepEqual(parseCSV(''), []);
});
