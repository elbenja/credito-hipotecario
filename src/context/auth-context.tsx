import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate, useLocation } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { checkUserSubscriptionStatus } from "@/services/planService"

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
      // 1) Clear all React-Query cache
      qc.clear()
          
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
          
          // Check subscription status after setting user
          if (currentSession?.user) {
            try {
              // Add timeout to prevent hanging
              const timeoutPromise = new Promise<boolean>((_, reject) => {
                setTimeout(() => reject(new Error('Subscription check timeout')), 10000) // 10 second timeout
              })
              
              const subscriptionPromise = checkUserSubscriptionStatus(currentSession.user.id)
              
              const access = await Promise.race([subscriptionPromise, timeoutPromise])
              setHasAccess(access)
              
              // Redirect based on access level
              if (location.pathname === '/' || location.pathname === '/auth') {
                if (access) {
                  navigate('/dashboard', { replace: true })
                } else {
                  navigate('/account', { replace: true })
                }
              }
            } catch (error) {
              console.error('❌ Error checking subscription status:', error)
              setHasAccess(false)
              if (location.pathname === '/' || location.pathname === '/auth') {
                navigate('/account', { replace: true })
              }
            }
          } else {
            console.log('📝 No user session, setting hasAccess to false')
            setHasAccess(false)
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setHasAccess(false)
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
        
        if (session?.user) {
          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<boolean>((_, reject) => {
              setTimeout(() => reject(new Error('Subscription check timeout')), 10000) // 10 second timeout
            })
            
            const subscriptionPromise = checkUserSubscriptionStatus(session.user.id)
            
            // Check subscription status
            const access = await Promise.race([subscriptionPromise, timeoutPromise])
            setHasAccess(access)
            
            // Redirect based on access level after auth change
            if (location.pathname === '/' || location.pathname === '/auth') {
              if (access) {
                navigate('/dashboard', { replace: true })
              } else {
                navigate('/account', { replace: true })
              }
            }
          } catch (error) {
            console.error('❌ Auth change - Error checking subscription status:', error)
            setHasAccess(false)
            if (location.pathname === '/' || location.pathname === '/auth') {
              navigate('/account', { replace: true })
            }
          }
        } else {
          console.log('📝 Auth change - No user session, setting hasAccess to false')
          setHasAccess(false)
          // If we don't have a session and we're not at the root, redirect to root
          if (location.pathname !== '/') {
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
    <AuthContext.Provider value={{ user, session, loading, signOut, hasAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
