import { createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { useOperatorRole } from '../../hooks/useOperatorRole.js';

const AdminRoleContext = createContext(null);

// Read the operator's role inside gated pages (e.g. to hide admin-only
// actions in later phases).
export function useAdminRole() {
  return useContext(AdminRoleContext);
}

// Wraps every /admin route. Shows a spinner while checking, redirects
// non-operators back to the app, and exposes the role to children. The server
// enforces access regardless — this only controls what renders.
export default function AdminGate({ children }) {
  const { role, checked } = useOperatorRole();

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  if (!role) return <Navigate to="/" replace />;

  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}
