import { useState } from 'react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { useSpendByCategory, useUpcomingCosts, useSubscriptions } from '../../hooks/useStats.js';
import { formatDate } from '../../utils/dateFormat.js';
import { billingPeriodLabel } from '../../utils/constants.js';

function SpendByCategory({ data, months, onMonthsChange }) {
  const max = data[0]?.total || 1;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Spend by Category</h3>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
          {[
            { label: 'Last 12 mo', value: 12 },
            { label: 'All time', value: 'all' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onMonthsChange(opt.value)}
              className={`px-2.5 py-1 rounded-md font-medium ${
                months === opt.value ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">No spend logged in this period.</p>
      ) : (
      <div className="space-y-2">
        {data.map(({ category, total }) => (
          <div key={category}>
            <div className="flex justify-between text-sm mb-0.5">
              <span className="text-slate-700">{category}</span>
              <span className="font-medium">${total.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(total / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function UpcomingCosts({ data }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Costs (90 days)</h3>
      <div className="divide-y divide-slate-100">
        {data.map(item => (
          <div key={item.id} className="flex justify-between py-2 text-sm">
            <div>
              <p className="text-slate-700">{item.name}</p>
              <p className="text-xs text-slate-400">{formatDate(item.next_date)} ({item.days_until}d)</p>
            </div>
            <span className="font-medium text-green-700">${item.estimated_cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold">
        <span>Total</span>
        <span>${data.reduce((s, i) => s + i.estimated_cost, 0).toFixed(2)}</span>
      </div>
    </div>
  );
}

function SubscriptionSummary({ data }) {
  if (!data) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Subscriptions</h3>
      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <div>
          <p className="text-2xl font-bold text-blue-600">{data.active_count}</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-400">{data.inactive_count}</p>
          <p className="text-xs text-slate-500">Inactive</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">${data.estimated_annual_cost.toFixed(0)}</p>
          <p className="text-xs text-slate-500">Est. Annual</p>
        </div>
      </div>
      {data.active_subs && data.active_subs.length > 0 && (
        <div className="divide-y divide-slate-100">
          {data.active_subs.map(sub => (
            <div key={sub.id} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-700">{sub.name}</span>
              {sub.last_price != null && (
                <span className="text-slate-500">
                  ${sub.last_price.toFixed(2)}
                  {billingPeriodLabel(sub.billing_period_months) && (
                    <span className="text-slate-400"> · {billingPeriodLabel(sub.billing_period_months)}</span>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [months, setMonths] = useState(12);
  const { data: spend, loading: l1 } = useSpendByCategory(months);
  const { data: upcoming, loading: l2 } = useUpcomingCosts();
  const { data: subs, loading: l3 } = useSubscriptions();
  // Only block the whole page on the first load; keep the spend card mounted
  // (with its toggle) while switching windows so it doesn't flash the spinner.
  const loading = (l1 && spend.length === 0) || l2 || l3;

  return (
    <PageShell>
      <TopBar title="Stats" />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="px-4 py-4 space-y-4">
          <SpendByCategory data={spend} months={months} onMonthsChange={setMonths} />
          <UpcomingCosts data={upcoming} />
          <SubscriptionSummary data={subs} />
          {upcoming.length === 0 && !subs?.active_count && (
            <p className="text-center text-sm text-slate-400 py-8">
              No stats available yet. Import items or log events with prices.
            </p>
          )}
        </div>
      )}
    </PageShell>
  );
}
