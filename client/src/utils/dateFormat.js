import { format, parseISO, isValid } from 'date-fns';

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  if (dateStr === 'never') return 'Never';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'M/d/yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  if (dateStr === 'never') return 'Never';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function toInputDate(dateStr) {
  if (!dateStr || dateStr === 'never') return '';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function fromInputDate(value) {
  if (!value) return null;
  return value; // Already yyyy-MM-dd
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}
