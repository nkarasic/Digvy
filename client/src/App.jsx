import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import LoginPage from './components/auth/LoginPage.jsx';
import UpdatePasswordPage from './components/auth/UpdatePasswordPage.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Toast from './components/common/Toast.jsx';
import DashboardPage from './components/dashboard/DashboardPage.jsx';
import StatsPage from './components/stats/StatsPage.jsx';
import SettingsPage from './components/settings/SettingsPage.jsx';
import ImportPage from './components/import/ImportPage.jsx';
import WelcomePage from './components/onboarding/WelcomePage.jsx';
import ItemDetailPage from './components/items/ItemDetailPage.jsx';
import ItemCreatePage from './components/items/ItemCreatePage.jsx';
import ItemEditPage from './components/items/ItemEditPage.jsx';
import AdminGate from './components/admin/AdminGate.jsx';
import AdminDashboardPage from './components/admin/AdminDashboardPage.jsx';
import AdminUserDetailPage from './components/admin/AdminUserDetailPage.jsx';
import AdminAuditPage from './components/admin/AdminAuditPage.jsx';
import AdminDigestRunsPage from './components/admin/AdminDigestRunsPage.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';

function AuthenticatedApp() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/items/new" element={<ItemCreatePage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/items/:id/edit" element={<ItemEditPage />} />
          <Route path="/admin" element={<AdminGate><AdminDashboardPage /></AdminGate>} />
          <Route path="/admin/users/:id" element={<AdminGate><AdminUserDetailPage /></AdminGate>} />
          <Route path="/admin/audit" element={<AdminGate><AdminAuditPage /></AdminGate>} />
          <Route path="/admin/digest-runs" element={<AdminGate><AdminDigestRunsPage /></AdminGate>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <BottomNav />
        <Toast />
      </HashRouter>
    </AppProvider>
  );
}

function AppRoot() {
  const { user, initializing, passwordRecovery } = useAuth();
  if (initializing) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }
  if (passwordRecovery) return <UpdatePasswordPage />;
  return user ? <AuthenticatedApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
