import { useNavigate } from 'react-router-dom';
import UrgencyIndicator from '../common/UrgencyIndicator.jsx';
import { getUrgencyStyles } from '../../utils/urgency.js';
import { formatDate } from '../../utils/dateFormat.js';

export default function DashboardCard({ item }) {
  const navigate = useNavigate();
  const styles = getUrgencyStyles(item.urgency);

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
          {!item.urgency && item.days_since_last != null && (
            <span className="text-xs text-slate-400">{item.days_since_last}d ago</span>
          )}
        </div>
      </div>
    </button>
  );
}
