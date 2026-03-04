import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Toast from './components/common/Toast.jsx';
import DashboardPage from './components/dashboard/DashboardPage.jsx';
import StatsPage from './components/stats/StatsPage.jsx';
import SettingsPage from './components/settings/SettingsPage.jsx';
import ImportPage from './components/import/ImportPage.jsx';
import ItemDetailPage from './components/items/ItemDetailPage.jsx';
import ItemCreatePage from './components/items/ItemCreatePage.jsx';
import ItemEditPage from './components/items/ItemEditPage.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/items/new" element={<ItemCreatePage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/items/:id/edit" element={<ItemEditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <BottomNav />
        <Toast />
      </HashRouter>
    </AppProvider>
  );
}
