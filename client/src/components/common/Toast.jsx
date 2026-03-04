import { useApp } from '../../context/AppContext.jsx';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
        isError ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
      }`}>
        {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
        {toast.message}
      </div>
    </div>
  );
}
