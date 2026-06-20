import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

// Usage: <ProtectedRoute roles={['lecturer']}><LecturerDashboard /></ProtectedRoute>
export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return null; // or a spinner

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
