import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, format } from 'date-fns';
import { buildDigest, renderDigestEmail } from '../services/digestBuilder.js';

const iso = (offsetDays) => format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');

function item(overrides = {}) {
  return {
    id: 'x',
    name: 'Test item',
    category: 'Home',
    status: 'Active',
    logic_type: 'Fixed',
    date_type: 'firm',
    booking_lead_days: 21,
    is_evergreen: false,
    next_date: null,
    cancel_by_date: null,
    snoozed_until: null,
    ...overrides,
  };
}

test('overdue item lands in overdue bucket', () => {
  const d = buildDigest([item({ next_date: iso(-3) })]);
  assert.equal(d.overdue.length, 1);
  assert.equal(d.dueSoon.length, 0);
  assert.equal(d.overdue[0].days, -3);
  assert.equal(d.total, 1);
});

test('item due today lands in dueSoon', () => {
  const d = buildDigest([item({ next_date: iso(0) })]);
  assert.equal(d.dueSoon.length, 1);
  assert.equal(d.dueSoon[0].days, 0);
});

test('item due in 7 days is included, 8 days is not', () => {
  const d = buildDigest([
    item({ name: 'in 7', next_date: iso(7) }),
    item({ name: 'in 8', next_date: iso(8) }),
  ]);
  assert.equal(d.total, 1);
  assert.equal(d.dueSoon[0].name, 'in 7');
});

test('snoozed items are excluded', () => {
  const d = buildDigest([item({ next_date: iso(-3), snoozed_until: iso(5) })]);
  assert.equal(d.total, 0);
});

test('expired snooze no longer suppresses the item', () => {
  const d = buildDigest([item({ next_date: iso(-3), snoozed_until: iso(-1) })]);
  assert.equal(d.overdue.length, 1);
});

test('evergreen items are excluded', () => {
  const d = buildDigest([item({ is_evergreen: true, cancel_by_date: iso(2) })]);
  assert.equal(d.total, 0);
});

test('inactive items are excluded', () => {
  const d = buildDigest([item({ status: 'Inactive', next_date: iso(-3) })]);
  assert.equal(d.total, 0);
});

test('items with no dates are excluded', () => {
  const d = buildDigest([item()]);
  assert.equal(d.total, 0);
});

test('earlier cancel_by drives the entry and its date', () => {
  const d = buildDigest([item({ next_date: iso(60), cancel_by_date: iso(3) })]);
  assert.equal(d.dueSoon.length, 1);
  assert.equal(d.dueSoon[0].source, 'cancel');
  assert.equal(d.dueSoon[0].days, 3);
  assert.equal(d.dueSoon[0].date, iso(3));
});

test('flexible item past target counts as overdue in the digest', () => {
  const d = buildDigest([item({ next_date: iso(-5), date_type: 'flexible' })]);
  assert.equal(d.overdue.length, 1);
  assert.equal(d.overdue[0].label, 'Schedule');
});

test('buckets are sorted most urgent first', () => {
  const d = buildDigest([
    item({ name: 'b', next_date: iso(-1) }),
    item({ name: 'a', next_date: iso(-9) }),
    item({ name: 'd', next_date: iso(6) }),
    item({ name: 'c', next_date: iso(2) }),
  ]);
  assert.deepEqual(d.overdue.map(e => e.name), ['a', 'b']);
  assert.deepEqual(d.dueSoon.map(e => e.name), ['c', 'd']);
});

test('renderDigestEmail includes counts, items, and unsubscribe link', () => {
  const digest = buildDigest([
    item({ name: 'Furnace filter', next_date: iso(-2) }),
    item({ name: 'Gym trial', next_date: iso(90), cancel_by_date: iso(4) }),
  ]);
  const { subject, html, text } = renderDigestEmail(digest, {
    appUrl: 'https://digvy.vercel.app',
    unsubscribeUrl: 'https://digvy.vercel.app/api/email/unsubscribe?token=tok123',
  });

  assert.equal(subject, 'Digvy: 1 overdue, 1 due this week');
  assert.ok(html.includes('Furnace filter'));
  assert.ok(html.includes('Gym trial'));
  assert.ok(html.includes('token=tok123'));
  assert.ok(text.includes('Furnace filter'));
  assert.ok(text.includes('2 days overdue'));
  assert.ok(text.includes('cancel by'));
  assert.ok(text.includes('token=tok123'));
});

test('renderDigestEmail escapes HTML in item names', () => {
  const digest = buildDigest([item({ name: '<script>alert(1)</script>', next_date: iso(1) })]);
  const { html } = renderDigestEmail(digest, { appUrl: 'x', unsubscribeUrl: 'y' });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('subject with only dueSoon omits overdue', () => {
  const digest = buildDigest([item({ next_date: iso(3) })]);
  const { subject } = renderDigestEmail(digest, { appUrl: 'x', unsubscribeUrl: 'y' });
  assert.equal(subject, 'Digvy: 1 due this week');
});
