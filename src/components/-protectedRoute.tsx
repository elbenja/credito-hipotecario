import { useNavigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Only redirect if we're not loading and there's no user
    if (!loading && !user) {
      // Check if we're not already on the auth page to prevent loops
      if (location.pathname !== '/auth') {
        navigate('/auth', { replace: true })
      }
    }
  }, [user, loading, navigate, location])

  // Show nothing while loading
  if (loading) {
    return null
  }

  // If we have a user, render children
  if (user) {
    return <>{children}</>
  }

  // If no user and not loading, render nothing while redirect happens
  return null
} 