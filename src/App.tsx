import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import OfflineIndicator from "@/components/OfflineIndicator";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Incomes from "./pages/Incomes";
import Expenses from "./pages/Expenses";
import Vehicle from "./pages/Vehicle";
import Drivers from "./pages/Drivers";
import VehicleStats from "./pages/VehicleStats";
import Maintenance from "./pages/Maintenance";
import Shifts from "./pages/Shifts";
import MyStats from "./pages/MyStats";
import Profitability from "./pages/Profitability";
import Settings from "./pages/Settings";
import DriverDashboard from "./pages/DriverDashboard";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Incomes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Expenses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicle"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Vehicle />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicle/:vehicleId/stats"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VehicleStats />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Drivers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Maintenance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shifts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Shifts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-stats"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyStats />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profitability"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profitability />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DriverDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
