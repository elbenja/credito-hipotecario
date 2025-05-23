import { useAuth } from "@/context/auth-context"

export function AuthDebug() {
  const { user, session, loading, hasAccess } = useAuth()

  if (loading) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-300 rounded p-4 text-sm z-50">
        <h3 className="font-bold text-yellow-800">Auth Debug (Loading...)</h3>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-100 border border-blue-300 rounded p-4 text-sm z-50 max-w-sm">
      <h3 className="font-bold text-blue-800 mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>
          <strong>User:</strong> {user ? user.email : 'None'}
        </div>
        <div>
          <strong>Session:</strong> {session ? 'Active' : 'None'}
        </div>
        <div>
          <strong>Has Access:</strong> {hasAccess === null ? 'Checking...' : hasAccess ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Current Path:</strong> {window.location.pathname}
        </div>
      </div>
    </div>
  )
} 