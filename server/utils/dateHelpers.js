import { parse, format, isValid, differenceInDays, addMonths, isBefore, startOfDay } from 'date-fns';

export function parseUSDate(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Try M/d/yyyy first
  let d = parse(trimmed, 'M/d/yyyy', new Date());
  if (isValid(d)) return d;

  // Try M/d/yy
  d = parse(trimmed, 'M/d/yy', new Date());
  if (isValid(d)) return d;

  // Try ISO
  d = new Date(trimmed);
  if (isValid(d)) return d;

  return null;
}

export function formatDate(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    if (date === 'never') return 'never';
    date = new Date(date);
  }
  return format(date, 'M/d/yyyy');
}

export function toISODate(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    if (date === 'never') return 'never';
    date = new Date(date);
  }
  return format(date, 'yyyy-MM-dd');
}

export function daysUntil(dateStr) {
  if (!dateStr || dateStr === 'never') return null;
  const d = new Date(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(startOfDay(d), startOfDay(new Date()));
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(startOfDay(new Date()), startOfDay(d));
}

export function advanceByMonths(dateStr, months) {
  const base = dateStr ? new Date(dateStr) : new Date();
  return toISODate(addMonths(base, months));
}

export { isValid, isBefore, differenceInDays, startOfDay, addMonths, format, parse };
