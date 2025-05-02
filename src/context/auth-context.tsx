import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate, useLocation } from "react-router-dom"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  loading: true,
  signOut: async () => {} 
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      // Clear state
      setSession(null)
      setUser(null)
      
      // Clear storage
      localStorage.removeItem('supabase.auth.token')
      
      // Use navigate with replace to prevent adding to history stack
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Error during sign out:', error)
      // Still clear state and redirect
      setSession(null)
      setUser(null)
      navigate('/', { replace: true })
    }
  }

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
          
          // If we have a session and we're at the root or auth page, redirect to dashboard
          if (currentSession?.user && (location.pathname === '/' || location.pathname === '/auth')) {
            console.log('Redirecting to dashboard...')
            navigate('/dashboard', { replace: true })
          }
          
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
        // console.log('Auth state changed:', { 
        //   event, 
        //   userEmail: session?.user?.email,
        //   currentPath: location.pathname
        // })

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // If we have a session and we're at the root or auth page, redirect to dashboard
          if (location.pathname === '/' || location.pathname === '/auth') {
            console.log('Redirecting to dashboard after auth change...')
            navigate('/dashboard', { replace: true })
          }
        } else {
          // If we don't have a session and we're not at the root, redirect to root
          if (location.pathname !== '/') {
            console.log('Redirecting to root after session end...')
            navigate('/', { replace: true })
          }
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate, location.pathname])

  // Show loading state while initializing auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Initializing...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
