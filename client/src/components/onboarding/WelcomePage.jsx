import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import PageShell from '../layout/PageShell.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import {
  STARTER_GROUPS, STARTER_TEMPLATES, TEMPLATE_BY_NAME, templateToItem,
} from '../../utils/starterTemplates.js';

const RECOMMENDED_IDS = STARTER_TEMPLATES.filter(t => t.recommended).map(t => t.id);

// Which inputs a just-created item needs in the finish-setup step.
function inputsFor(item) {
  const template = TEMPLATE_BY_NAME[item.name];
  const showDate =
    (item.logic_type === 'Fixed' || item.logic_type === 'Interval') && !item.next_date;
  const showDetails = !!template?.detailsHint;
  return { template, showDate, showDetails, needsInput: showDate || showDetails };
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const { showToast, triggerRefresh } = useApp();

  const [stage, setStage] = useState('pick'); // 'pick' | 'finish'
  const [selected, setSelected] = useState(() => new Set(RECOMMENDED_IDS));
  const [adding, setAdding] = useState(false);

  // Finish-setup state
  const [created, setCreated] = useState([]);
  const [setups, setSetups] = useState({}); // { [itemId]: { date, details } }
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    const items = STARTER_TEMPLATES.filter(t => selected.has(t.id)).map(templateToItem);
    if (items.length === 0) return;
    setAdding(true);
    try {
      const { imported, items: createdItems } = await api.importConfirm(items);
      triggerRefresh();
      const needing = (createdItems || []).filter(i => inputsFor(i).needsInput);
      if (needing.length === 0) {
        showToast(`Added ${imported} item${imported === 1 ? '' : 's'}`);
        navigate('/');
        return;
      }
      // Move into the finish-setup step for items that want input.
      setCreated(createdItems);
      setSetups(Object.fromEntries(createdItems.map(i => [i.id, { date: '', details: '' }])));
      setStage('finish');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  function updateSetup(id, patch) {
    setSetups(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const updates = [];
      for (const item of created) {
        const { showDate, showDetails } = inputsFor(item);
        const s = setups[item.id] || {};
        const patch = {};
        if (showDate && s.date) patch.next_date = s.date;
        if (showDetails && s.details.trim()) patch.details = s.details.trim();
        if (Object.keys(patch).length) updates.push(api.updateItem(item.id, patch));
      }
      if (updates.length) await Promise.all(updates);
      triggerRefresh();
      showToast('Setup saved');
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ---- Finish-setup stage -------------------------------------------------
  if (stage === 'finish') {
    const toSetup = created.filter(i => inputsFor(i).needsInput);
    return (
      <PageShell>
        <div className="px-4 pt-6 pb-2">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Finish setup</h1>
          <p className="text-sm text-slate-500">
            Add a date or details now, or skip and fill them in later from the dashboard.
          </p>
        </div>

        <div className="px-4 py-2 space-y-3">
          {toSetup.map(item => {
            const { template, showDate, showDetails } = inputsFor(item);
            const Icon = template?.icon;
            const s = setups[item.id] || {};
            return (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={18} className="text-slate-400" />}
                  <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                </div>
                {showDate && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      {item.logic_type === 'Interval' ? 'Next due' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={s.date}
                      onChange={e => updateSetup(item.id, { date: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {showDetails && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Details</label>
                    <textarea
                      value={s.details}
                      onChange={e => updateSetup(item.id, { details: e.target.value })}
                      rows={2}
                      placeholder={template.detailsHint}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-14 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex items-center gap-3 max-w-lg mx-auto">
          <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-500 px-2 py-2">
            Skip
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </PageShell>
    );
  }

  // ---- Pick stage ---------------------------------------------------------
  const count = selected.size;

  return (
    <PageShell>
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Let's set up what to track</h1>
        <p className="text-sm text-slate-500">
          Pick a few to get started. You can set exact dates later, and add your own anytime.
        </p>
      </div>

      <div className="px-4 pb-4">
        {STARTER_GROUPS.map(group => (
          <section key={group.label} className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
              {group.label}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {group.templates.map(t => {
                const on = selected.has(t.id);
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    aria-pressed={on}
                    className={`relative text-left rounded-xl border-2 p-2.5 min-h-[76px] transition-colors ${
                      on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Icon size={19} className={on ? 'text-blue-600' : 'text-slate-400'} />
                    <span
                      className={`absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                        on ? 'bg-blue-600' : 'border-[1.5px] border-slate-300'
                      }`}
                    >
                      {on && <Check size={12} className="text-white" strokeWidth={3} />}
                    </span>
                    <p className={`text-[13px] font-medium mt-1.5 leading-tight ${on ? 'text-blue-900' : 'text-slate-900'}`}>
                      {t.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.timing}</p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky action bar, sits just above the bottom nav */}
      <div className="sticky bottom-14 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex items-center gap-3 max-w-lg mx-auto">
        <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-500 px-2 py-2">
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={count === 0 || adding}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {adding ? 'Adding...' : count === 0 ? 'Add items' : `Add ${count} item${count === 1 ? '' : 's'}`}
        </button>
      </div>
    </PageShell>
  );
}
