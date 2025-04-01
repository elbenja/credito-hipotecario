import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth()

  // Add debug logging

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect to login if no session or user
  if (!session || !user) {
    console.log('No session or user, redirecting to /')
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
