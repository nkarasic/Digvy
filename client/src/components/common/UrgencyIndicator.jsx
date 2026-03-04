import { getUrgencyStyles, formatDaysLabel } from '../../utils/urgency.js';

export default function UrgencyIndicator({ urgency, compact = false }) {
  if (!urgency) return null;
  const styles = getUrgencyStyles(urgency);
  if (!styles) return null;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${styles.text}`}>
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
        {formatDaysLabel(urgency)}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${styles.badge}`}>
      <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
      {formatDaysLabel(urgency)}
    </div>
  );
}
