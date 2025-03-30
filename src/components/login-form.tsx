"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Success toast
      toast({
        title: t("success"),
        description: t("auth.login.success"),
      })

      // Explicitly navigate to dashboard after successful login
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      setError(error.message || t("error_message"))
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("error_message"),
      })
      console.error("Auth error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail || !resetEmail.includes('@')) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("auth.login.valid_email_required"),
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) throw error

      toast({
        title: t("success"),
        description: t("auth.login.reset_email_sent"),
      })
      setIsResettingPassword(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("error_message"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6">
      {isResettingPassword ? (
        <div className="grid gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">{t("auth.login.reset_password")}</h1>
            <p className="text-md">{t("auth.login.reset_instructions")}</p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">
                {t("auth.login.email")}
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t("auth.login.email_placeholder")}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("auth.login.submitting") : t("auth.login.send_reset_link")}
            </Button>
          </form>
          <Button
            onClick={() => setIsResettingPassword(false)}
            variant="link"
            className="mx-auto text-blue-500 font-bold"
          >
            {t("auth.login.back_to_login")}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">
              {t("auth.login.early_access")}
            </h1>
            <p className="text-md">
              {t("auth.login.credentials_prompt")}
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4 mt-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.login.email")}</Label>
              <Input
                id="email"
                name="email"
                placeholder={t("auth.login.email_placeholder")}
                required
                type="email"
                disabled={isLoading}
                autoComplete="username"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.login.password")}</Label>
              <Input
                id="password"
                name="password"
                required
                type="password"
                disabled={isLoading}
                autoComplete="current-password"
                className="bg-card"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.login.loading")}
                </>
              ) : (
                t("auth.login.sign_in")
              )}
            </Button>
            <Button
              type="button"
              variant="link"
              className="mx-auto text-blue-500 font-bold"
              onClick={() => setIsResettingPassword(true)}
              disabled={isLoading}
            >
              {t("auth.login.forgot_password")}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
