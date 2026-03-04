import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertTriangle, Check } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../utils/dateFormat.js';

function ImportUpload({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.importPreview(file);
      onParsed(result.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-8">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300'
        }`}
      >
        <Upload size={32} className="mx-auto mb-3 text-slate-400" />
        <p className="text-sm text-slate-600 mb-3">
          {loading ? 'Parsing...' : 'Drop a CSV file here or tap to browse'}
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={e => handleFile(e.target.files[0])}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer"
        >
          Choose File
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TriageCard({ item, index, onUpdate }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-900 truncate">{item.name}</h3>
          <p className="text-xs text-slate-500">{item.category}</p>
        </div>
        <select
          value={item.status}
          onChange={e => onUpdate(index, { status: e.target.value })}
          className="text-xs rounded border border-slate-200 px-1.5 py-0.5"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Historical">Historical</option>
        </select>
      </div>

      {item.next_date && (
        <p className="text-xs text-slate-500">Next: {formatDate(item.next_date)}</p>
      )}

      {item._warnings && item._warnings.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {item._warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const navigate = useNavigate();
  const { showToast, triggerRefresh } = useApp();
  const [candidates, setCandidates] = useState(null);
  const [importing, setImporting] = useState(false);

  function handleUpdate(index, changes) {
    setCandidates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...changes };
      return next;
    });
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await api.importConfirm(candidates);
      showToast(`Imported ${result.imported} items`);
      triggerRefresh();
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  if (!candidates) {
    return (
      <PageShell>
        <TopBar title="Import CSV" showBack />
        <ImportUpload onParsed={setCandidates} />
      </PageShell>
    );
  }

  const active = candidates.filter(i => i.status === 'Active');
  const inactive = candidates.filter(i => i.status === 'Inactive');
  const historical = candidates.filter(i => i.status === 'Historical');

  return (
    <PageShell>
      <TopBar title={`Review (${candidates.length} items)`} showBack />
      <div className="px-4 py-4 space-y-4">
        {[
          { label: 'Active', items: active, color: 'text-blue-600' },
          { label: 'Inactive', items: inactive, color: 'text-slate-500' },
          { label: 'Historical', items: historical, color: 'text-slate-400' },
        ].map(({ label, items, color }) => items.length > 0 && (
          <section key={label}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${color}`}>
              {label} ({items.length})
            </h2>
            <div className="space-y-2">
              {items.map((item) => {
                const globalIndex = candidates.indexOf(item);
                return <TriageCard key={globalIndex} item={item} index={globalIndex} onUpdate={handleUpdate} />;
              })}
            </div>
          </section>
        ))}

        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Check size={18} />
          {importing ? 'Importing...' : `Import All ${candidates.length} Items`}
        </button>
      </div>
    </PageShell>
  );
}
