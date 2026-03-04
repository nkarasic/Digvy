import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { SNOOZE_PRESETS } from '../../utils/constants.js';
import { format, addDays } from 'date-fns';

export default function SnoozeModal({ open, onClose, item }) {
  const { triggerRefresh, showToast } = useApp();
  const [customDate, setCustomDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSnooze(dateStr) {
    setSaving(true);
    try {
      await api.snooze(item.id, dateStr);
      showToast('Item snoozed');
      triggerRefresh();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Snooze Item">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Snooze without logging an event. The item will reappear after the snooze period.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {SNOOZE_PRESETS.map(({ label, days }) => {
            const target = format(addDays(new Date(), days), 'yyyy-MM-dd');
            return (
              <button
                key={label}
                onClick={() => handleSnooze(target)}
                disabled={saving}
                className="py-2.5 px-3 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 active:bg-slate-200 disabled:opacity-50"
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-1">Custom date</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => customDate && handleSnooze(customDate)}
              disabled={!customDate || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
