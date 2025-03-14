import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"

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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      // Force clear the session and user state even if the API call fails
      setSession(null)
      setUser(null)
      // Clear any stored auth data from localStorage
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('supabase.auth.expires')
      // Reload the page to ensure clean state
      window.location.href = '/'
    } catch (error) {
      console.error('Error during sign out:', error)
      // Still clear the session and user state
      setSession(null)
      setUser(null)
      window.location.href = '/'
    }
  }

  useEffect(() => {
    // Initialize the session from local storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
