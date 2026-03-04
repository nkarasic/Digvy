import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TopBar({ title, showBack = false, right }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
        {showBack && (
          <button onClick={() => navigate(-1)} className="mr-2 -ml-2 p-1 text-slate-600">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="text-lg font-semibold text-slate-900 flex-1 truncate">{title}</h1>
        {right && <div className="ml-2">{right}</div>}
      </div>
    </header>
  );
}
