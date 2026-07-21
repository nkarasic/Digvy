import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { api } from '../../api/client.js';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function AdminDigestRunsPage() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.admin.digestRuns().then(setRows).catch(() => setRows(false));
  }, []);

  return (
    <PageShell>
      <TopBar title="Digest Runs" showBack />
      <div className="px-4 py-4">
        {rows === null && <LoadingSpinner />}
        {rows === false && <p className="text-sm text-red-600">Could not load digest runs.</p>}
        {Array.isArray(rows) && rows.length === 0 && (
          <EmptyState icon={Mail} title="No runs yet" description="The nightly digest and admin resends will appear here." />
        )}
        {Array.isArray(rows) && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {r.scope === 'all' ? 'Nightly (all users)' : 'Single user'}
                    {r.dry_run && <span className="ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">dry run</span>}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{fmtDate(r.ran_at)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  <span className="text-emerald-600">{r.sent} sent</span>
                  <span>{r.skipped} skipped</span>
                  <span className={r.errors ? 'text-red-600 font-medium' : ''}>{r.errors} errors</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
