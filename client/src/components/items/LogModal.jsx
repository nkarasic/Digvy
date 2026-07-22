import { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { todayISO, toInputDate, fromInputDate } from '../../utils/dateFormat.js';
import { format, addMonths, parseISO } from 'date-fns';

export default function LogModal({ open, onClose, item }) {
  const { triggerRefresh, showToast } = useApp();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // "Set up the next one" section. Hidden for Reference items (no schedule).
  const canSchedule = item?.logic_type !== 'Reference';
  const [setNext, setSetNext] = useState(true);
  const [nextDate, setNextDate] = useState('');
  const [cancelBy, setCancelBy] = useState('');
  const [noNext, setNoNext] = useState(false);
  // Track whether the user hand-edited the next date, so recomputing the
  // Interval suggestion when the log date changes doesn't clobber their entry.
  const [nextTouched, setNextTouched] = useState(false);

  const isInterval = item?.logic_type === 'Interval' && item?.interval_months;

  // For Interval items, suggest logDate + interval as the next date.
  const suggestedNext = isInterval && date
    ? toInputDate(format(addMonths(parseISO(date), item.interval_months), 'yyyy-MM-dd'))
    : '';

  // Reset the form each time the modal opens for a (possibly different) item.
  useEffect(() => {
    if (!open) return;
    const today = todayISO();
    setDate(today);
    setTime('');
    setPricePaid('');
    setNote('');
    setSaving(false);
    setSetNext(item?.logic_type !== 'Reference');
    setNoNext(false);
    setNextTouched(false);
    setCancelBy(toInputDate(item?.cancel_by_date));
    setNextDate(
      item?.logic_type === 'Interval' && item?.interval_months
        ? toInputDate(format(addMonths(parseISO(today), item.interval_months), 'yyyy-MM-dd'))
        : ''
    );
  }, [open, item?.id]);

  // Keep the Interval suggestion in sync with the log date until hand-edited.
  useEffect(() => {
    if (isInterval && !nextTouched && !noNext) setNextDate(suggestedNext);
  }, [suggestedNext, isInterval, nextTouched, noNext]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date,
        time: time || null,
        price_paid: pricePaid ? parseFloat(pricePaid) : null,
        note,
      };
      if (canSchedule && setNext) {
        payload.set_next = true;
        payload.is_evergreen = noNext;
        payload.next_date = noNext ? null : (fromInputDate(nextDate) || null);
        payload.cancel_by_date = fromInputDate(cancelBy) || null;
      }
      await api.addLog(item.id, payload);
      showToast(
        canSchedule && setNext ? 'Logged and next occurrence scheduled' : 'Event logged'
      );
      triggerRefresh();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const scheduling = canSchedule && setNext && !noNext && (nextDate || cancelBy);

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

        {canSchedule && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Set up the next one</span>
              <input
                type="checkbox"
                checked={setNext}
                onChange={e => setSetNext(e.target.checked)}
                className="rounded"
              />
            </label>

            {setNext && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-slate-700">Next Date</label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={noNext}
                        onChange={e => setNoNext(e.target.checked)}
                        className="rounded"
                      />
                      No next date
                    </label>
                  </div>
                  {!noNext && (
                    <input
                      type="date"
                      value={nextDate}
                      onChange={e => { setNextDate(e.target.value); setNextTouched(true); }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>

                {!noNext && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cancel By (optional)</label>
                    <input
                      type="date"
                      value={cancelBy}
                      onChange={e => setCancelBy(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {isInterval && !noNext && !nextTouched && suggestedNext && (
                  <p className="text-xs text-slate-500">
                    Suggested from {item.interval_months}-month interval. Edit if needed.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : scheduling ? 'Log & Schedule Next' : 'Log Event'}
        </button>
      </form>
    </Modal>
  );
}
