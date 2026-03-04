import { formatDateShort } from '../../utils/dateFormat.js';

export default function Timeline({ logs }) {
  if (!logs || logs.length === 0) {
    return <p className="text-sm text-slate-400 py-4">No log entries yet.</p>;
  }

  // Show most recent first
  const sorted = [...logs].reverse();

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-200" />

      <div className="space-y-4">
        {sorted.map((log, i) => (
          <div key={log.id || i} className="relative flex gap-3">
            {/* Dot */}
            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              i === 0 ? 'bg-blue-600' : 'bg-slate-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white'}`} />
            </div>

            {/* Content */}
            <div className={`flex-1 rounded-lg p-3 ${i === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    {formatDateShort(log.date)}
                  </span>
                  {log.time && (
                    <span className="text-xs text-slate-500 ml-2">{log.time}</span>
                  )}
                </div>
                {log.price_paid != null && log.price_paid > 0 && (
                  <span className="text-sm font-medium text-green-700">
                    ${log.price_paid.toFixed(2)}
                  </span>
                )}
              </div>
              {log.note && (
                <p className="text-sm text-slate-600 mt-1">{log.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
