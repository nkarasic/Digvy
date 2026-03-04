import { STATUS_COLORS } from '../../utils/constants.js';

export default function StatusBadge({ status }) {
  const classes = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}
