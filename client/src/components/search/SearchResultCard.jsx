import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';
import UrgencyIndicator from '../common/UrgencyIndicator.jsx';

export default function SearchResultCard({ item }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/items/${item.id}`)}
      className="w-full text-left bg-white rounded-lg p-3 shadow-sm active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 truncate">{item.name}</h3>
          <p className="text-xs text-slate-500">{item.category}</p>
          {item.details && <p className="text-xs text-slate-400 mt-1 truncate">{item.details}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={item.status} />
          {item.urgency && <UrgencyIndicator urgency={item.urgency} compact />}
        </div>
      </div>
    </button>
  );
}
