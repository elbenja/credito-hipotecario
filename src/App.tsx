import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from "@/components/theme-provider"
import Index from "./pages/Index"
import Auth from "./pages/Auth"
import NotFound from "./pages/NotFound"
import Dashboard from "./pages/Dashboard"
import Properties from "./pages/Properties"
import Mortgages from "./pages/Mortgages"
import NewAmortization from "./pages/NewAmortization"
import EditAmortization from "./pages/EditAmortization"
import Settings from "./pages/Settings"
import Test from "./pages/Test"
import TestCalculator from "./pages/TestCalculator"
import TestExtraInstallments from "./pages/TestExtraInstallments"
import ComingSoon from "./pages/coming-soon"
import EarlyAccessAdmin from "./pages/admin/early-access"
import UserManagement from "./pages/admin/user-management"
import UpdatePassword from "./pages/update-password"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache persists for 30 minutes
      refetchOnWindowFocus: true, // Refetch data when window regains focus
      refetchOnReconnect: true, // Refetch when reconnecting
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

const App = () => (
  <HelmetProvider>
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/coming-soon" element={<ComingSoon />} />
                <Route path="/app" element={<Index />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/reset-password" element={<Navigate to="/update-password" replace />} />
                <Route
                  path="/admin/early-access"
                  element={
                    <ProtectedRoute>
                      <EarlyAccessAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/properties"
                  element={
                    <ProtectedRoute>
                      <Properties />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mortgages"
                  element={
                    <ProtectedRoute>
                      <Mortgages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mortgages/new"
                  element={
                    <ProtectedRoute>
                      <NewAmortization />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mortgages/:id"
                  element={
                    <ProtectedRoute>
                      <EditAmortization />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route path="/test" element={<Test />} />
                <Route path="/test-calculator" element={<TestCalculator />} />
                <Route path="/test-extra-installments" element={<TestExtraInstallments />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
)

export default App
