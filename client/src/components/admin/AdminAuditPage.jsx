import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { api } from '../../api/client.js';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function AdminAuditPage() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.admin.audit().then(setRows).catch(() => setRows(false));
  }, []);

  return (
    <PageShell>
      <TopBar title="Audit Log" showBack />
      <div className="px-4 py-4">
        {rows === null && <LoadingSpinner />}
        {rows === false && <p className="text-sm text-red-600">Could not load the audit log.</p>}
        {Array.isArray(rows) && rows.length === 0 && (
          <EmptyState icon={ScrollText} title="No activity yet" description="Operator actions will appear here." />
        )}
        {Array.isArray(rows) && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono font-medium text-slate-900">{r.action}</span>
                  <span className="text-xs text-slate-400 shrink-0">{fmtDate(r.created_at)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  by {r.actor_email || r.actor_id}
                  {r.target_email && ` → ${r.target_email}`}
                </div>
                {r.payload && (
                  <pre className="mt-1.5 text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(r.payload)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
