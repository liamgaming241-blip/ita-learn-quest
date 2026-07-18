import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useAccess } from "@/hooks/useAccess";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: access, isLoading: accessLoading } = useAccess();

  if (loading || (user && accessLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (access && !access.has_access && location.pathname !== "/subscription-required") {
    return <Navigate to="/subscription-required" replace />;
  }
  return <>{children}</>;
};
