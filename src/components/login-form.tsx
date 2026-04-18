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
import { mapSupabaseErrorToTranslationKey } from "@/utils/supabase-error-mapper"

const EXTERNAL_SIGNUP_URL = "https://demo.creditohipotecar.io/signup"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation('global')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        console.error("Login error:", error)
        throw error
      }

      navigate("/dashboard", { replace: true })

    } catch (error: any) {
      const errorKey = mapSupabaseErrorToTranslationKey(error)
      
      // Try to get translated error, fallback to original message or generic error
      let translatedError: string
      try {
        translatedError = t(errorKey as any)
      } catch {
        translatedError = error.message || t("ui.error")
      }
      
      setError(translatedError)
      toast({
        variant: "destructive",
        title: t("ui.error"),
        description: translatedError,
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
        title: t("ui.error"),
        description: t("auth.login.valid_email_required", "Please enter a valid email address."),
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
        title: t("ui.success"),
        description: t("auth.login.reset_email_sent", "Password reset email sent."),
      })
      setIsResettingPassword(false)
    } catch (error: any) {
      const errorKey = mapSupabaseErrorToTranslationKey(error)
      
      // Try to get translated error, fallback to original message or generic error
      let translatedError: string
      try {
        translatedError = t(errorKey as any)
      } catch {
        translatedError = error.message || t("ui.error")
      }
      
      toast({
        variant: "destructive",
        title: t("ui.error"),
        description: translatedError,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Google OAuth sign in handler
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        console.error("Google sign-in error:", error)
        throw error
      }

      // The redirect will handle the rest
    } catch (error: any) {
      const errorKey = mapSupabaseErrorToTranslationKey(error)
      
      let translatedError: string
      try {
        translatedError = t(errorKey as any)
      } catch {
        translatedError = error.message || t("auth.errors.google_signin_failed", "Google sign-in failed")
      }
      
      setError(translatedError)
      toast({
        variant: "destructive",
        title: t("ui.error"),
        description: translatedError,
      })
      console.error("Google OAuth error:", error)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      {isResettingPassword ? (
        <div className="grid gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">{t("auth.login.reset_password", "Reset Password")}</h1>
            <p className="text-md">{t("auth.login.reset_instructions", "Enter your email and we'll send you a link to reset your password")}</p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">
                {t("auth.login.email", "Email")}
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t("auth.login.email_placeholder", "Enter your email")}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("auth.login.submitting", "Submitting...") : t("auth.login.send_reset_link", "Send Reset Link")}
            </Button>
          </form>
          <Button
            onClick={() => setIsResettingPassword(false)}
            variant="link"
            className="mx-auto  font-bold"
          >
            {t("auth.login.back_to_login", "Back to Login")}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">{t("auth.login.welcome_back", "Welcome back")}</h1>
            <p className="text-gray-500">
              {t("auth.login.credentials_prompt", "Please enter your credentials to continue")}
            </p>
          </div>

          {/* Google Sign-In Section */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {t("auth.login.continue_with_google", "Continue with Google")}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("auth.login.or", "Or")}
                </span>
              </div>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.login.email", "Email")}</Label>
              <Input
                id="email"
                name="email"
                placeholder={t("auth.login.email_placeholder", "Enter your email")}
                required
                type="email"
                disabled={isLoading || isGoogleLoading}
                autoComplete="username"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.login.password", "Password")}</Label>
              <Input
                id="password"
                name="password"
                required
                type="password"
                disabled={isLoading || isGoogleLoading}
                autoComplete="current-password"
                className="bg-card"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading || isGoogleLoading}>
               {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.login.loading", "Signing in...")}
                </>
              ) : (
                t("auth.login.sign_in", "Sign In")
              )}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full  font-bold"
              onClick={() => setIsResettingPassword(true)}
              disabled={isLoading || isGoogleLoading}
            >
              {t("auth.login.forgot_password", "Forgot Password?")}
            </Button>
          </form>
          <div className="text-center text-sm">
        <Button
          variant="link"
          className="text-sm"
          onClick={() => window.location.assign(EXTERNAL_SIGNUP_URL)}
          disabled={isLoading || isGoogleLoading}
        >
          {t("auth.login.no_account", "Don't have an account?")}
        </Button>
      </div>
        </>
      )}
    </div>
  )
}
