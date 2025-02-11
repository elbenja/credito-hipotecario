
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import Index from "./pages/Index"
import Auth from "./pages/Auth"
import NotFound from "./pages/NotFound"
import Dashboard from "./pages/Dashboard"
import Properties from "./pages/Properties"
import Amortizations from "./pages/Amortizations"
import NewAmortization from "./pages/NewAmortization"
import EditAmortization from "./pages/EditAmortization"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
)

export default App
