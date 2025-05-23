import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate, useLocation } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useSubscriptionAccess } from "@/hooks/usePlanLimits"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  hasAccess: boolean | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  loading: true,
  hasAccess: null,
  signOut: async () => {}   
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient() // for invalidating queries May20
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  const navigate = useNavigate()
  const location = useLocation()

  // Use the subscription hook to check access
  const { hasAccess: hookHasAccess, isLoading: subscriptionLoading } = useSubscriptionAccess(user?.id || null)

  // Update hasAccess when hook data changes
  useEffect(() => {
    if (!subscriptionLoading && user) {
      setHasAccess(hookHasAccess)
    } else if (!user) {
      setHasAccess(false)
    }
  }, [hookHasAccess, subscriptionLoading, user])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      // Clear state
      setSession(null)
      setUser(null)
      setHasAccess(null)
      
      // Clear storage
      localStorage.removeItem('supabase.auth.token')
      // 1) Clear all React-Query cache
      qc.clear()
          
      // Use navigate with replace to prevent adding to history stack
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Error during sign out:', error)
      // Still clear state and redirect
      setSession(null)
      setUser(null)
      setHasAccess(null)
      navigate('/', { replace: true })
    }
  }

  // Handle navigation based on auth and subscription status
  useEffect(() => {
    // Only navigate if we have complete information and we're on landing/auth pages
    if (loading || subscriptionLoading || hasAccess === null) return
    
    if (location.pathname === '/' || location.pathname === '/auth') {
      if (user && hasAccess) {
        navigate('/dashboard', { replace: true })
      } else if (user && !hasAccess) {
        navigate('/account', { replace: true })
      } else if (!user && location.pathname !== '/') {
        navigate('/', { replace: true })
      }
    }
  }, [user, hasAccess, loading, subscriptionLoading, location.pathname, navigate])

  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        // console.log('Initializing auth...')
        // Get the current session from Supabase
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate, location.pathname])

  // Show loading state while initializing auth or subscription
  if (loading || (user && subscriptionLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Initializing...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, hasAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
