import { parse, parseISO, format, isValid, differenceInDays, addMonths, isBefore, startOfDay } from 'date-fns';

// Parse date strings as LOCAL dates. `new Date('2026-07-04')` treats
// date-only ISO strings as UTC midnight, which shifts them a day in
// negative-offset timezones; parseISO parses them as local midnight.
function toLocalDate(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export function parseUSDate(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // US-style dates — 'M/d/yyyy' would accept '7/4/26' as year 0026,
  // so pick the format from the year's digit count
  const us = trimmed.match(/^\d{1,2}\/\d{1,2}\/(\d{2,4})$/);
  if (us) {
    const d = parse(trimmed, us[1].length <= 2 ? 'M/d/yy' : 'M/d/yyyy', new Date());
    return isValid(d) ? d : null;
  }

  // Try ISO
  return toLocalDate(trimmed);
}

export function formatDate(date) {
  if (!date) return null;
  if (typeof date === 'string') date = toLocalDate(date);
  if (!date) return null;
  return format(date, 'M/d/yyyy');
}

export function toISODate(date) {
  if (!date) return null;
  if (typeof date === 'string') date = toLocalDate(date);
  if (!date) return null;
  return format(date, 'yyyy-MM-dd');
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = toLocalDate(dateStr);
  if (!d) return null;
  return differenceInDays(startOfDay(d), startOfDay(new Date()));
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = toLocalDate(dateStr);
  if (!d) return null;
  return differenceInDays(startOfDay(new Date()), startOfDay(d));
}

export function advanceByMonths(dateStr, months) {
  const base = dateStr ? toLocalDate(dateStr) : new Date();
  return toISODate(addMonths(base || new Date(), months));
}

export { isValid, isBefore, differenceInDays, startOfDay, addMonths, format, parse };
