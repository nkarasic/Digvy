import { URGENCY_COLORS } from './constants.js';

export function getUrgencyStyles(urgency) {
  if (!urgency) return null;
  return URGENCY_COLORS[urgency.color] || null;
}

export function formatDaysLabel(urgency) {
  if (!urgency) return '';
  const { days, label } = urgency;
  if (days === null || days === undefined) return label;

  const absDays = Math.abs(days);

  if (label === 'Schedule') {
    return `Schedule (${absDays}d overdue)`;
  }
  if (label === 'Time to book') {
    return `Time to book in ${absDays}d`;
  }

  if (days < 0) {
    return `${label} ${absDays}d ago`;
  }
  if (days === 0) return `${label} today`;
  return `${label} in ${absDays}d`;
}
