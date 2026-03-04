import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Inbox, Search, X } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import DashboardCard from './DashboardCard.jsx';
import SearchResultCard from '../search/SearchResultCard.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useDashboard } from '../../hooks/useItems.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { api } from '../../api/client.js';

const URGENCY_CHIPS = [
  { key: 'red', label: 'Overdue', color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'yellow', label: 'Due Soon', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { key: 'blue', label: 'Time to book', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'green', label: 'On Track', color: 'bg-green-100 text-green-700 border-green-300' },
];

export default function DashboardPage() {
  const { data, loading } = useDashboard();
  const navigate = useNavigate();

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const debouncedQuery = useDebounce(query, 200);

  // Filter state
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeUrgency, setActiveUrgency] = useState(null);

  const isSearching = query.trim().length > 0;

  // Run search
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearched(false);
      return;
    }
    setSearched(true);
    api.search(debouncedQuery).then(setSearchResults).catch(() => setSearchResults([]));
  }, [debouncedQuery]);

  // Reset filters when search activates
  useEffect(() => {
    if (isSearching) {
      setActiveCategory(null);
      setActiveUrgency(null);
    }
  }, [isSearching]);

  // Derive category chips from dashboard data
  const categories = useMemo(() => {
    const allItems = [...(data.action_required || []), ...(data.no_upcoming || [])];
    return [...new Set(allItems.map(i => i.category).filter(Boolean))].sort();
  }, [data]);

  // Apply filters to dashboard sections
  const filteredActionRequired = useMemo(() => {
    let items = data.action_required || [];
    if (activeCategory) items = items.filter(i => i.category === activeCategory);
    if (activeUrgency) items = items.filter(i => i.urgency?.color === activeUrgency);
    return items;
  }, [data.action_required, activeCategory, activeUrgency]);

  const filteredNoUpcoming = useMemo(() => {
    let items = data.no_upcoming || [];
    if (activeCategory) items = items.filter(i => i.category === activeCategory);
    // Urgency filter doesn't apply to no_upcoming (they have no urgency)
    if (activeUrgency) return [];
    return items;
  }, [data.no_upcoming, activeCategory, activeUrgency]);

  function clearSearch() {
    setQuery('');
    setSearchResults([]);
    setSearched(false);
  }

  function toggleCategory(cat) {
    setActiveCategory(prev => prev === cat ? null : cat);
    setActiveUrgency(null); // single-select across groups
  }

  function toggleUrgency(key) {
    setActiveUrgency(prev => prev === key ? null : key);
    setActiveCategory(null); // single-select across groups
  }

  const hasAnyFilter = activeCategory || activeUrgency;

  return (
    <PageShell>
      <TopBar title="Digvy" />

      {/* Search bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search items, notes, details..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-9 py-2.5 text-sm bg-white"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips — hidden during search */}
      {!isSearching && !loading && (categories.length > 0 || true) && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
          {categories.length > 0 && URGENCY_CHIPS.length > 0 && (
            <div className="shrink-0 w-px bg-slate-200 my-0.5" />
          )}
          {URGENCY_CHIPS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleUrgency(key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeUrgency === key ? color : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isSearching ? (
        <div className="px-4 py-2 space-y-2">
          {searchResults.length > 0 ? (
            searchResults.map(item => <SearchResultCard key={item.id} item={item} />)
          ) : searched ? (
            <EmptyState
              icon={Search}
              title="No results"
              description={`Nothing found for "${debouncedQuery}"`}
            />
          ) : null}
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : filteredActionRequired.length === 0 && filteredNoUpcoming.length === 0 ? (
        hasAnyFilter ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No items match the selected filter
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No items yet"
            description="Import a CSV or create your first item"
            action={
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Get Started
              </button>
            }
          />
        )
      ) : (
        <div className="px-4 py-4 space-y-6">
          {filteredActionRequired.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Action Required ({filteredActionRequired.length})
              </h2>
              <div className="space-y-2">
                {filteredActionRequired.map(item => (
                  <DashboardCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {filteredNoUpcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                No Upcoming Date ({filteredNoUpcoming.length})
              </h2>
              <div className="space-y-2">
                {filteredNoUpcoming.map(item => (
                  <DashboardCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => navigate('/items/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-blue-700 z-30"
      >
        <Plus size={24} />
      </button>
    </PageShell>
  );
}
