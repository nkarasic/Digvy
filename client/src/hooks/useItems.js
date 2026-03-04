import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

export function useDashboard() {
  const [data, setData] = useState({ action_required: [], no_upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshKey } = useApp();

  useEffect(() => {
    setLoading(true);
    api.getDashboard()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return { data, loading, error };
}

export function useItem(id) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshKey } = useApp();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getItem(id)
      .then(setItem)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, refreshKey]);

  return { item, loading, error };
}

export function useItems(status) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useApp();

  useEffect(() => {
    setLoading(true);
    api.getItems(status)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, refreshKey]);

  return { items, loading };
}
