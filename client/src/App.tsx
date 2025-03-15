import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import UserManagement from "@/pages/admin/user-management";
import ProductsPricing from "@/pages/admin/products-pricing";
import DashboardDesigner from "@/pages/admin/dashboard-designer";
import ApiIntegration from "@/pages/admin/api-integration";
import ApiTest from "@/pages/admin/api-test";

// Reseller Pages
import ResellerDashboard from "@/pages/reseller/dashboard";
import Clients from "@/pages/reseller/clients";
import Products from "@/pages/reseller/products";
import Billing from "@/pages/reseller/billing";
import Settings from "@/pages/reseller/settings";

import "./theme.css";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth" component={AuthPage} />

      {/* Protected Admin Routes */}
      <ProtectedRoute path="/" component={AdminDashboard} requiredRole="admin" />
      <ProtectedRoute path="/admin/users" component={UserManagement} requiredRole="admin" />
      <ProtectedRoute path="/admin/products-pricing" component={ProductsPricing} requiredRole="admin" />
      <ProtectedRoute path="/admin/dashboard-designer" component={DashboardDesigner} requiredRole="admin" />
      <ProtectedRoute path="/admin/api-integration" component={ApiIntegration} requiredRole="admin" />

      {/* Protected Reseller Routes */}
      <ProtectedRoute path="/reseller" component={ResellerDashboard} requiredRole="reseller" />
      <ProtectedRoute path="/reseller/clients" component={Clients} requiredRole="reseller" />
      <ProtectedRoute path="/reseller/products" component={Products} requiredRole="reseller" />
      <ProtectedRoute path="/reseller/billing" component={Billing} requiredRole="reseller" />
      <ProtectedRoute path="/reseller/settings" component={Settings} requiredRole="reseller" />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
