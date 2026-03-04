import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <AppContext.Provider value={{ refreshKey, triggerRefresh, toast, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
