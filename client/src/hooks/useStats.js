import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

export function useSpendByCategory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useApp();

  useEffect(() => {
    api.getSpendByCategory().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [refreshKey]);

  return { data, loading };
}

export function useUpcomingCosts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useApp();

  useEffect(() => {
    api.getUpcomingCosts().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [refreshKey]);

  return { data, loading };
}

export function useSubscriptions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useApp();

  useEffect(() => {
    api.getSubscriptions().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [refreshKey]);

  return { data, loading };
}
