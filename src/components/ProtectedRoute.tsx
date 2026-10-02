import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children, adminOnly = false, vendorOnly = false }: { children: React.ReactNode; adminOnly?: boolean; vendorOnly?: boolean }) => {
  const { user, isAdmin, isVendor, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (vendorOnly && !isVendor) return <Navigate to="/vendor/apply" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
