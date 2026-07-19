import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Database, Info, LogOut, Mail } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../api/client.js';

function DigestToggle() {
  const { showToast } = useApp();
  const [enabled, setEnabled] = useState(null); // null = still loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getEmailPreferences()
      .then(({ digest_enabled }) => { if (!cancelled) setEnabled(digest_enabled); })
      .catch(() => { if (!cancelled) showToast('Could not load email preferences', 'error'); });
    return () => { cancelled = true; };
  }, [showToast]);

  const toggle = async () => {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    try {
      await api.updateEmailPreferences(next);
      setEnabled(next);
      showToast(next ? 'Daily digest enabled' : 'Daily digest disabled');
    } catch {
      showToast('Could not save email preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <Mail size={20} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Daily digest email</h3>
          <p className="text-xs text-slate-500">Email me a daily digest of overdue and due-soon items</p>
        </div>
        <button
          role="switch"
          aria-checked={enabled === true}
          aria-label="Email me a daily digest of overdue and due-soon items"
          onClick={toggle}
          disabled={enabled === null || saving}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
            enabled ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <PageShell>
      <TopBar title="Settings" />
      <div className="px-4 py-4 space-y-3">
        <button
          onClick={() => navigate('/import')}
          className="w-full flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm active:bg-slate-50 text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Upload size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Import CSV</h3>
            <p className="text-xs text-slate-500">Import items from a spreadsheet</p>
          </div>
        </button>

        <DigestToggle />

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Database size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Account</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Info size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">About Digvy</h3>
              <p className="text-xs text-slate-500">v1.0 — Track infrequent life events</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm active:bg-slate-50 text-left"
        >
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <LogOut size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-600">Sign Out</h3>
          </div>
        </button>
      </div>
    </PageShell>
  );
}
