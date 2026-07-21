import { useNavigate } from 'react-router-dom';
import { Calendar, FilePenLine } from 'lucide-react';
import UrgencyIndicator from '../common/UrgencyIndicator.jsx';
import { getUrgencyStyles } from '../../utils/urgency.js';
import { formatDate } from '../../utils/dateFormat.js';

export default function DashboardCard({ item }) {
  const navigate = useNavigate();
  const styles = getUrgencyStyles(item.urgency);

  // Dated item (Fixed/Interval) that hasn't had its date set yet — nudge the user
  // to fill it in. Reference items are dateless by design, so they don't qualify.
  const needsDate =
    !item.urgency && !item.is_evergreen &&
    item.logic_type !== 'Reference' && !item.next_date;

  // Reference item with no details yet — its whole value is the info, so nudge.
  const needsInfo =
    item.logic_type === 'Reference' && !item.details?.trim();

  return (
    <button
      onClick={() => navigate(`/items/${item.id}`)}
      className={`w-full text-left rounded-lg border-l-4 bg-white p-3 shadow-sm active:bg-slate-50 transition-colors ${
        styles ? styles.border : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 truncate">{item.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
          {item.details && (
            <p className="text-xs text-slate-400 mt-1 truncate">{item.details}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {item.urgency && <UrgencyIndicator urgency={item.urgency} compact />}
          {needsDate && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
              <Calendar size={12} /> Set date
            </span>
          )}
          {needsInfo && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
              <FilePenLine size={12} /> Add info
            </span>
          )}
          {!item.urgency && !needsDate && !needsInfo && item.days_since_last != null && (
            <span className="text-xs text-slate-400">{item.days_since_last}d ago</span>
          )}
        </div>
      </div>
    </button>
  );
}
