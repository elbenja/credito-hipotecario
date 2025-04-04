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
        toast.error(t("update_password_page.invalid_or_expired_link", { ns: "global" }))
      } catch (error: any) {
        console.error("Error validating recovery token:", error)
        setValidRecoveryToken(false)
        toast.error(error.message || t("update_password_page.invalid_or_expired_link", { ns: "global" }))
      }
    }
    
    checkForToken()
  }, [t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error(t("update_password_page.passwords_dont_match", { ns: "global" }))
      return
    }

    if (password.length < 6) {
      toast.error(t("update_password_page.password_too_short", { ns: "global" }))
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

      toast.success(t("update_password_page.password_updated", { ns: "global" }))
      navigate("/dashboard")
    } catch (error: any) {
      toast.error(error.message || t("update_password_page.error_updating_password", { ns: "global" }))
    } finally {
      setLoading(false)
    }
  }

  // If we haven't yet determined if the token is valid
  if (validRecoveryToken === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t("update_password_page.loading", { ns: "global" })}...</p>
      </div>
    )
  }

  // If the token is invalid
  if (validRecoveryToken === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">{t("update_password_page.invalid_link", { ns: "global" })}</h1>
        <p className="mb-4 text-center">{t("update_password_page.recovery_link_invalid_or_expired", { ns: "global" })}</p>
        <Button onClick={() => navigate("/")}>
          {t("update_password_page.back_to_home", { ns: "global" })}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            {t("update_password_page.update_your_password", { ns: "global" })}
          </h1>
          <p>
            {t("update_password_page.create_new_password_prompt", { ns: "global" })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">{t("update_password_page.new_password", { ns: "global" })}</Label>
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
            <Label htmlFor="confirmPassword">{t("update_password_page.confirm_password", { ns: "global" })}</Label>
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
            {loading ? t("update_password_page.updating", { ns: "global" }) : t("update_password_page.update_password", { ns: "global" })}
          </Button>
        </form>
      </div>
    </div>
  )
} 