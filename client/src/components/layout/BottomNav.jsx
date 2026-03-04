import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Settings } from 'lucide-react';

const tabs = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
