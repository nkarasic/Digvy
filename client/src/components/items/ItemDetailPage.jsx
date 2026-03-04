import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Clock, AlarmClock, CalendarX2 } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import UrgencyIndicator from '../common/UrgencyIndicator.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import Timeline from './Timeline.jsx';
import LogModal from './LogModal.jsx';
import SnoozeModal from './SnoozeModal.jsx';
import { useItem } from '../../hooks/useItems.js';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../api/client.js';
import { formatDate } from '../../utils/dateFormat.js';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { item, loading } = useItem(id);
  const { showToast, triggerRefresh } = useApp();
  const [logOpen, setLogOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this item?')) return;
    try {
      await api.deleteItem(id);
      showToast('Item deleted');
      triggerRefresh();
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <PageShell><TopBar title="..." showBack /><LoadingSpinner /></PageShell>;
  if (!item) return <PageShell><TopBar title="Not Found" showBack /><p className="p-4 text-slate-500">Item not found.</p></PageShell>;

  return (
    <PageShell>
      <TopBar
        title={item.name}
        showBack
        right={
          <div className="flex gap-2">
            <button onClick={() => navigate(`/items/${id}/edit`)} className="p-1.5 text-slate-500">
              <Edit3 size={18} />
            </button>
            <button onClick={handleDelete} className="p-1.5 text-red-500">
              <Trash2 size={18} />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.category}</span>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{item.logic_type}</span>
          </div>

          {item.urgency && <UrgencyIndicator urgency={item.urgency} />}

          {item.details && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-0.5">Details</p>
              <p className="text-sm text-slate-800">{item.details}</p>
            </div>
          )}

          {item.link_url && (
            <a href={item.link_url} target="_blank" rel="noopener noreferrer"
               className="text-sm text-blue-600 underline break-all">
              {item.link_url}
            </a>
          )}
        </div>

        {/* Schedule Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Schedule</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-400 text-xs">Next Date</span>
              <p className="font-medium">{formatDate(item.next_date)}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Cancel By</span>
              <p className="font-medium">{formatDate(item.cancel_by_date)}</p>
            </div>
            {item.logic_type === 'Interval' && (
              <div>
                <span className="text-slate-400 text-xs">Interval</span>
                <p className="font-medium">{item.interval_months} months</p>
              </div>
            )}
            {item.date_type && (
              <div>
                <span className="text-slate-400 text-xs">Date Type</span>
                <p className="font-medium capitalize">{item.date_type}</p>
              </div>
            )}
            {item.date_type === 'flexible' && item.booking_lead_days != null && (
              <div>
                <span className="text-slate-400 text-xs">Booking Lead</span>
                <p className="font-medium">{item.booking_lead_days} days</p>
              </div>
            )}
            {item.snoozed_until && (
              <div>
                <span className="text-slate-400 text-xs">Snoozed Until</span>
                <p className="font-medium text-amber-600">{formatDate(item.snoozed_until)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setLogOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            <Clock size={16} /> Log Event
          </button>
          {item.urgency && (item.urgency.color === 'red' || item.urgency.label === 'Schedule') && (
            <button
              onClick={() => setSnoozeOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
            >
              <AlarmClock size={16} /> Snooze
            </button>
          )}
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">History</h3>
          <Timeline logs={item.logs} />
        </div>
      </div>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} item={item} />
      <SnoozeModal open={snoozeOpen} onClose={() => setSnoozeOpen(false)} item={item} />
    </PageShell>
  );
}
