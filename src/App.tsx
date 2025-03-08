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
import Amortizations from "./pages/Amortizations"
import NewAmortization from "./pages/NewAmortization"
import EditAmortization from "./pages/EditAmortization"
import Settings from "./pages/Settings"
import Test from "./pages/Test"
import TestCalculator from "./pages/TestCalculator"
import TestExtraInstallments from "./pages/TestExtraInstallments"
import ComingSoon from "./pages/coming-soon"
import EarlyAccessAdmin from "./pages/admin/early-access"

const queryClient = new QueryClient()

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
                <Route path="/" element={<ComingSoon />} />
                <Route path="/app" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/admin/early-access"
                  element={
                    <ProtectedRoute>
                      <EarlyAccessAdmin />
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
                  path="/amortizations"
                  element={
                    <ProtectedRoute>
                      <Amortizations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/amortizations/new"
                  element={
                    <ProtectedRoute>
                      <NewAmortization />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/amortizations/:id"
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
