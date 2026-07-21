import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Package, Activity, ClipboardList, ShieldCheck, ChevronRight, Search, Mail } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { api } from '../../api/client.js';
import { useDebounce } from '../../hooks/useDebounce.js';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

function MetricTile({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);

  useEffect(() => {
    api.admin.metrics().then(setMetrics).catch(() => setMetrics(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setUsers(null);
    api.admin.users(debounced)
      .then((rows) => { if (!cancelled) setUsers(rows); })
      .catch(() => { if (!cancelled) setUsers(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  return (
    <PageShell>
      <TopBar
        title="Admin Console"
        right={
          <button onClick={() => navigate('/admin/audit')} className="text-sm font-medium text-blue-600">
            Audit
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {metrics === null && <LoadingSpinner />}
        {metrics === false && <p className="text-sm text-red-600">Could not load metrics.</p>}
        {metrics && (
          <div className="grid grid-cols-2 gap-3">
            <MetricTile icon={Users} label="Users" value={metrics.users} tone="bg-blue-100 text-blue-600" />
            <MetricTile icon={Activity} label="Active items" value={metrics.active_items} tone="bg-emerald-100 text-emerald-600" />
            <MetricTile icon={Package} label="Total items" value={metrics.items} tone="bg-violet-100 text-violet-600" />
            <MetricTile icon={ClipboardList} label="Logs" value={metrics.logs} tone="bg-amber-100 text-amber-600" />
            <MetricTile icon={ShieldCheck} label="Operators" value={metrics.operators} tone="bg-slate-100 text-slate-600" />
            <MetricTile icon={Mail} label="Digests sent 24h" value={metrics.digests_sent_24h ?? 0} tone="bg-sky-100 text-sky-600" />
          </div>
        )}

        <button
          onClick={() => navigate('/admin/digest-runs')}
          className="w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm active:bg-slate-50 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">Digest runs</div>
            <div className="text-xs text-slate-500">Nightly sends and resends{metrics && metrics.digest_errors_24h > 0 && ` · ${metrics.digest_errors_24h} errors in 24h`}</div>
          </div>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </button>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by email"
            className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl shadow-sm text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {users === null && <LoadingSpinner />}
        {users === false && <p className="text-sm text-red-600">Could not load users.</p>}
        {Array.isArray(users) && users.length === 0 && (
          <EmptyState icon={Users} title="No users" description={query ? 'No emails match your search.' : 'No accounts yet.'} />
        )}
        {Array.isArray(users) && users.length > 0 && (
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm active:bg-slate-50 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">{u.email}</span>
                    {u.role && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-900 text-white shrink-0">
                        {u.role}
                      </span>
                    )}
                    {!u.email_confirmed && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                        unconfirmed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {u.active_item_count}/{u.item_count} active · joined {fmtDate(u.created_at)}
                    {!u.digest_enabled && ' · digest off'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
