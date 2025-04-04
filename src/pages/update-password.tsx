import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useTranslation } from "react-i18next"

export default function UpdatePassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [validRecoveryToken, setValidRecoveryToken] = useState<boolean | null>(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    // Try to get token from both URL query parameters and hash fragment
    const checkForToken = async () => {
      try {
        // Check if there's a recovery token in the URL query parameters
        const urlParams = new URLSearchParams(window.location.search)
        const urlToken = urlParams.get("token")
        const urlType = urlParams.get("type")
        
        // Check if there's a recovery token in the URL hash fragment
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.substring(1))
        const hashAccessToken = hashParams.get("access_token")
        const hashRefreshToken = hashParams.get("refresh_token")
        const hashType = hashParams.get("type")

        // First try the hash method (for in-app redirects)
        if ((hashType === "recovery" || hashType === "signup") && hashAccessToken) {
          setValidRecoveryToken(true)
          
          // Set the session from the hash fragment
          try {
            await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken || "",
            })
            console.log("Session set from hash token")
            return
          } catch (error) {
            console.error("Error setting session from hash token:", error)
            // Continue to try other methods
          }
        }
        
        // Then try the query parameter method (for email links)
        if ((urlType === "recovery") && urlToken) {
          try {
            console.log("Attempting to verify OTP with token:", urlToken)
            // For email links, we need to exchange the token for a session
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: urlToken,
              type: 'recovery',
            })
            
            if (error) {
              console.error("OTP verification error:", error)
              throw error
            }
            
            console.log("OTP verification successful:", data)
            setValidRecoveryToken(true)
            return
          } catch (tokenError) {
            console.error("Token verification failed:", tokenError)
            // Continue to last resort
          }
        }
        
        // Last resort: Check if user is already authenticated (session might be valid)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log("Using existing session")
          setValidRecoveryToken(true)
          return
        }
        
        // If no valid token or session found
        console.error("No valid token or session found")
        setValidRecoveryToken(false)
        toast.error("Invalid or expired recovery link")
      } catch (error: any) {
        console.error("Error validating recovery token:", error)
        setValidRecoveryToken(false)
        toast.error(error.message || "Invalid or expired recovery link")
      }
    }
    
    checkForToken()
  }, [t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      toast.success("Password updated successfully")
      navigate("/dashboard")
    } catch (error: any) {
      toast.error(error.message || "Error updating password")
    } finally {
      setLoading(false)
    }
  }

  // If we haven't yet determined if the token is valid
  if (validRecoveryToken === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  // If the token is invalid
  if (validRecoveryToken === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
        <p className="mb-4 text-center">The password recovery link is invalid or has expired</p>
        <Button onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            Update Your Password
          </h1>
          <p>
            Create a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  )
} 