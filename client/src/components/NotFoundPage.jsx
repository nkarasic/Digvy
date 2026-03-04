import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import PageShell from './layout/PageShell.jsx';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-6xl font-bold text-slate-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-slate-700 mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-400 mb-6">The page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          <Home size={16} /> Back to Dashboard
        </button>
      </div>
    </PageShell>
  );
}
