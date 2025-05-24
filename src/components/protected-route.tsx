import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading, hasAccess } = useAuth()
  const location = useLocation()

  // Add debug logging

  // Show loading state while checking auth or subscription status
  if (loading || hasAccess === null) {
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

  // If user doesn't have access, only allow /account page
  // if (hasAccess === false) {
  //   if (location.pathname !== '/account') {
  //     console.log('No access, redirecting to /account')
  //     return <Navigate to="/account" replace />
  //   }
  // }

  return <>{children}</>
}
