import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { todayISO } from '../../utils/dateFormat.js';
import { format, addMonths, parseISO } from 'date-fns';

export default function LogModal({ open, onClose, item }) {
  const { triggerRefresh, showToast } = useApp();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Show predicted next date for Interval items
  const predictedNext = item?.logic_type === 'Interval' && item?.interval_months && date
    ? format(addMonths(parseISO(date), item.interval_months), 'M/d/yyyy')
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addLog(item.id, {
        date,
        time: time || null,
        price_paid: pricePaid ? parseFloat(pricePaid) : null,
        note,
      });
      showToast('Event logged');
      triggerRefresh();
      onClose();
      // Reset form
      setDate(todayISO());
      setTime('');
      setPricePaid('');
      setNote('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Time (optional)</label>
          <input
            type="text"
            value={time}
            onChange={e => setTime(e.target.value)}
            placeholder="e.g., 8:40 AM"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price Paid (optional)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pricePaid}
              onChange={e => setPricePaid(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
          />
        </div>

        {predictedNext && (
          <p className="text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            Next date will be set to {predictedNext}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Log Event'}
        </button>
      </form>
    </Modal>
  );
}
