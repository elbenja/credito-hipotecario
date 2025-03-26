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
    // Check if there's a recovery token in the URL
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.substring(1))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")
    const type = hashParams.get("type")

    if ((type === "recovery" || type === "signup") && accessToken) {
      setValidRecoveryToken(true)
      
      // Set the session from the hash fragment
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      })
    } else {
      setValidRecoveryToken(false)
      toast.error(t("update_password_page.invalid_or_expired_link"))
    }
  }, [t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error(t("update_password_page.passwords_dont_match"))
      return
    }

    if (password.length < 6) {
      toast.error(t("update_password_page.password_too_short"))
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

      toast.success(t("update_password_page.password_updated"))
      navigate("/dashboard")
    } catch (error: any) {
      toast.error(error.message || t("update_password_page.error_updating_password"))
    } finally {
      setLoading(false)
    }
  }

  // If we haven't yet determined if the token is valid
  if (validRecoveryToken === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t("update_password_page.loading")}...</p>
      </div>
    )
  }

  // If the token is invalid
  if (validRecoveryToken === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">{t("update_password_page.invalid_link")}</h1>
        <p className="mb-4 text-center">{t("update_password_page.recovery_link_invalid_or_expired")}</p>
        <Button onClick={() => navigate("/")}>
          {t("update_password_page.back_to_home")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            {t("update_password_page.update_your_password")}
          </h1>
          <p>
            {t("update_password_page.create_new_password_prompt")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">{t("update_password_page.new_password")}</Label>
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
            <Label htmlFor="confirmPassword">{t("update_password_page.confirm_password")}</Label>
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
            {loading ? t("update_password_page.updating") : t("update_password_page.update_password")}
          </Button>
        </form>
      </div>
    </div>
  )
} 