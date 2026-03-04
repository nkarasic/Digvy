import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { CATEGORIES, INTERVAL_PRESETS } from '../../utils/constants.js';
import { toInputDate, fromInputDate } from '../../utils/dateFormat.js';

export default function ItemForm({ initialData, onSubmit, submitLabel = 'Save' }) {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [status, setStatus] = useState(initialData?.status || 'Active');
  const [logicType, setLogicType] = useState(initialData?.logic_type || 'Fixed');
  const [intervalMonths, setIntervalMonths] = useState(initialData?.interval_months || '');
  const [nextDate, setNextDate] = useState(toInputDate(initialData?.next_date));
  const [neverExpires, setNeverExpires] = useState(initialData?.next_date === 'never');
  const [cancelByDate, setCancelByDate] = useState(toInputDate(initialData?.cancel_by_date));
  const [details, setDetails] = useState(initialData?.details || '');
  const [linkUrl, setLinkUrl] = useState(initialData?.link_url || '');
  const [dateType, setDateType] = useState(initialData?.date_type || 'firm');
  const [bookingLeadDays, setBookingLeadDays] = useState(initialData?.booking_lead_days ?? 21);
  const [categories, setCategories] = useState(CATEGORIES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCategories().then(cats => {
      if (cats.length > 0) {
        const merged = [...new Set([...CATEGORIES, ...cats])].sort();
        setCategories(merged);
      }
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        category,
        status,
        logic_type: logicType,
        interval_months: logicType === 'Interval' ? Number(intervalMonths) || null : null,
        next_date: neverExpires ? 'never' : (fromInputDate(nextDate) || null),
        cancel_by_date: fromInputDate(cancelByDate) || null,
        date_type: logicType !== 'Reference' ? dateType : 'firm',
        booking_lead_days: dateType === 'flexible' ? (Number(bookingLeadDays) || 21) : null,
        details,
        link_url: linkUrl || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
        <input
          type="text"
          list="category-list"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <datalist id="category-list">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Historical">Historical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select value={logicType} onChange={e => setLogicType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="Fixed">Fixed</option>
            <option value="Interval">Interval</option>
            <option value="Reference">Reference</option>
          </select>
        </div>
      </div>

      {logicType === 'Interval' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Interval (months)</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {INTERVAL_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setIntervalMonths(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  Number(intervalMonths) === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            value={intervalMonths}
            onChange={e => setIntervalMonths(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Custom months"
          />
        </div>
      )}

      {logicType !== 'Reference' && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Next Date</label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={e => setNeverExpires(e.target.checked)}
                  className="rounded"
                />
                Never expires
              </label>
            </div>
            {!neverExpires && (
              <input
                type="date"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            {!neverExpires && nextDate && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Date Type</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden w-fit">
                  {['firm', 'flexible'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDateType(type)}
                      className={`px-4 py-1.5 text-xs font-medium capitalize ${
                        dateType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {dateType === 'flexible' && logicType === 'Interval' && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Booking Lead (days)</label>
                    <input
                      type="number"
                      min="1"
                      value={bookingLeadDays}
                      onChange={e => setBookingLeadDays(e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cancel By Date</label>
            <input
              type="date"
              value={cancelByDate}
              onChange={e => setCancelByDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
          placeholder="Part numbers, model info, specs, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Link URL</label>
        <input
          type="url"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </div>

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
