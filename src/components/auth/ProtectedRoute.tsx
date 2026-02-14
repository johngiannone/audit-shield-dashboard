import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If specified, user must have one of these roles to access the route */
  requiredRoles?: AppRole[];
}

/**
 * Route guard component that checks authentication and optionally role-based access.
 * Redirects to /auth if not authenticated, or /dashboard if role is insufficient.
 */
export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
