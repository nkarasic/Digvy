import { useNavigate } from 'react-router-dom';
import { Upload, Database, Info, LogOut } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

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
