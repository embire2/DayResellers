import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import { UserRole } from "@shared/types";
import { MainLayout } from "@/components/layout/main-layout";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: UserRole;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        if (requiredRole && user.role !== requiredRole) {
          // Redirect admin to admin dashboard
          if (user.role === 'admin') {
            return <Redirect to="/" />;
          }
          // Redirect reseller to reseller dashboard
          else if (user.role === 'reseller') {
            return <Redirect to="/reseller" />;
          }
        }

        return (
          <MainLayout>
            <Component />
          </MainLayout>
        );
      }}
    </Route>
  );
}
