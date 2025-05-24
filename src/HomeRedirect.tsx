import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'

export default function HomeRedirect() {
  const { user, loading, hasAccess } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading || hasAccess === null) return

    if (user && hasAccess) {
      navigate('/dashboard', { replace: true })
    } else if (user && !hasAccess) {
      navigate('/account', { replace: true })
    } else {
      navigate('/auth', { replace: true })
    }
  }, [user, hasAccess, loading, navigate])

  return null
}