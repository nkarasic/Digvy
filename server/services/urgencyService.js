import { daysUntil } from '../utils/dateHelpers.js';

export function computeUrgency(item) {
  if (item.status !== 'Active') return null;

  const nextDays = daysUntil(item.next_date);
  const cancelDays = daysUntil(item.cancel_by_date);

  // Check snoozed
  if (item.snoozed_until) {
    const snoozeRemaining = daysUntil(item.snoozed_until);
    if (snoozeRemaining !== null && snoozeRemaining > 0) {
      return { color: 'green', label: 'Snoozed', days: snoozeRemaining, source: 'snooze' };
    }
  }

  // Determine which date drives urgency
  let effectiveDays = null;
  let source = 'due';

  if (nextDays !== null && cancelDays !== null) {
    if (cancelDays < nextDays) {
      effectiveDays = cancelDays;
      source = 'cancel';
    } else {
      effectiveDays = nextDays;
      source = 'due';
    }
  } else if (nextDays !== null) {
    effectiveDays = nextDays;
    source = 'due';
  } else if (cancelDays !== null) {
    effectiveDays = cancelDays;
    source = 'cancel';
  } else {
    return null; // No dates — no urgency
  }

  const isFlexible = item.date_type === 'flexible';
  const leadDays = item.booking_lead_days != null ? item.booking_lead_days : 21;

  let color, label;
  if (isFlexible && source === 'due') {
    // Flexible items (next_date-sourced) never go red
    if (effectiveDays < 0) {
      color = 'blue';
      label = 'Schedule';
    } else if (effectiveDays <= leadDays) {
      color = 'blue';
      label = 'Time to book';
    } else {
      color = 'green';
      label = 'On track';
    }
  } else {
    // Firm items or cancel_by-sourced urgency
    if (effectiveDays < 0) {
      color = 'red';
      label = source === 'cancel' ? 'Cancel by' : 'Overdue';
    } else if (effectiveDays <= 30) {
      color = 'yellow';
      label = source === 'cancel' ? 'Cancel by' : 'Due soon';
    } else {
      color = 'green';
      label = source === 'cancel' ? 'Cancel by' : 'On track';
    }
  }

  return { color, label, days: effectiveDays, source };
}
