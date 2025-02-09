
import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!session || !user) {
    return <Navigate to="/auth" />
  }

  return <>{children}</>
}
