import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, format } from 'date-fns';
import { computeUrgency } from '../services/urgencyService.js';

const iso = (offsetDays) => format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');

function item(overrides = {}) {
  return {
    status: 'Active',
    logic_type: 'Fixed',
    date_type: 'firm',
    booking_lead_days: 21,
    next_date: null,
    cancel_by_date: null,
    snoozed_until: null,
    ...overrides,
  };
}

test('inactive items have no urgency', () => {
  assert.equal(computeUrgency(item({ status: 'Inactive', next_date: iso(-5) })), null);
});

test('no dates means no urgency', () => {
  assert.equal(computeUrgency(item()), null);
});

test('firm item overdue is red', () => {
  const u = computeUrgency(item({ next_date: iso(-3) }));
  assert.equal(u.color, 'red');
  assert.equal(u.label, 'Overdue');
  assert.equal(u.days, -3);
});

test('firm item due within 30 days is yellow', () => {
  const u = computeUrgency(item({ next_date: iso(15) }));
  assert.equal(u.color, 'yellow');
  assert.equal(u.label, 'Due soon');
});

test('firm item beyond 30 days is green', () => {
  const u = computeUrgency(item({ next_date: iso(60) }));
  assert.equal(u.color, 'green');
  assert.equal(u.label, 'On track');
});

test('flexible item within booking lead is blue "Time to book"', () => {
  const u = computeUrgency(item({ next_date: iso(10), date_type: 'flexible', booking_lead_days: 21 }));
  assert.equal(u.color, 'blue');
  assert.equal(u.label, 'Time to book');
});

test('flexible item past due is blue "Schedule", never red', () => {
  const u = computeUrgency(item({ next_date: iso(-10), date_type: 'flexible' }));
  assert.equal(u.color, 'blue');
  assert.equal(u.label, 'Schedule');
});

test('flexible item beyond lead time is green', () => {
  const u = computeUrgency(item({ next_date: iso(90), date_type: 'flexible', booking_lead_days: 21 }));
  assert.equal(u.color, 'green');
});

test('earlier cancel_by_date drives urgency over next_date', () => {
  const u = computeUrgency(item({ next_date: iso(60), cancel_by_date: iso(10) }));
  assert.equal(u.source, 'cancel');
  assert.equal(u.color, 'yellow');
  assert.equal(u.label, 'Cancel by');
});

test('cancel_by-sourced urgency goes red even on flexible items', () => {
  const u = computeUrgency(item({ date_type: 'flexible', cancel_by_date: iso(-1) }));
  assert.equal(u.source, 'cancel');
  assert.equal(u.color, 'red');
});

test('active snooze wins and shows green', () => {
  const u = computeUrgency(item({ next_date: iso(-5), snoozed_until: iso(7) }));
  assert.equal(u.color, 'green');
  assert.equal(u.label, 'Snoozed');
  assert.equal(u.source, 'snooze');
});

test('expired snooze falls through to normal urgency', () => {
  const u = computeUrgency(item({ next_date: iso(-5), snoozed_until: iso(-1) }));
  assert.equal(u.color, 'red');
});
