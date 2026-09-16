import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Toast from './components/common/Toast.jsx';

// Route-level code splitting. Only the shell — contexts, nav, toast, spinner —
// ships in the entry chunk; every screen is fetched on demand.
//
// The biggest win is the operator console: five pages that no ordinary user can
// reach, which previously shipped to all of them. The landing page and the app
// are mutually exclusive by auth state, so splitting those means signed-out
// visitors don't download the item forms and signed-in users don't download the
// marketing page.
const LandingPage = lazy(() => import('./components/auth/LandingPage.jsx'));
const UpdatePasswordPage = lazy(() => import('./components/auth/UpdatePasswordPage.jsx'));

const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage.jsx'));
const StatsPage = lazy(() => import('./components/stats/StatsPage.jsx'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage.jsx'));
const ImportPage = lazy(() => import('./components/import/ImportPage.jsx'));
const WelcomePage = lazy(() => import('./components/onboarding/WelcomePage.jsx'));
const ItemDetailPage = lazy(() => import('./components/items/ItemDetailPage.jsx'));
const ItemCreatePage = lazy(() => import('./components/items/ItemCreatePage.jsx'));
const ItemEditPage = lazy(() => import('./components/items/ItemEditPage.jsx'));

const AdminGate = lazy(() => import('./components/admin/AdminGate.jsx'));
const AdminDashboardPage = lazy(() => import('./components/admin/AdminDashboardPage.jsx'));
const AdminUserDetailPage = lazy(() => import('./components/admin/AdminUserDetailPage.jsx'));
const AdminAuditPage = lazy(() => import('./components/admin/AdminAuditPage.jsx'));
const AdminDigestRunsPage = lazy(() => import('./components/admin/AdminDigestRunsPage.jsx'));

const NotFoundPage = lazy(() => import('./components/NotFoundPage.jsx'));

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <AppProvider>
      <HashRouter>
        {/* Suspense sits inside the router so the bottom nav stays put while a
            route's chunk loads — only the content area shows the spinner. */}
        <Suspense fallback={<LoadingSpinner />}>
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
        </Suspense>
        <BottomNav />
        <Toast />
      </HashRouter>
    </AppProvider>
  );
}

function AppRoot() {
  const { user, initializing, passwordRecovery } = useAuth();
  if (initializing) return <FullPageSpinner />;

  return (
    <Suspense fallback={<FullPageSpinner />}>
      {passwordRecovery
        ? <UpdatePasswordPage />
        : user ? <AuthenticatedApp /> : <LandingPage />}
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
