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

interface LoginFormProps {
  defaultIsSignUp?: boolean
}

export function LoginForm({ defaultIsSignUp = false }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(defaultIsSignUp)
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

    // Client-side password validation for sign up
    if (isSignUp) {
      // Check minimum length
      if (password.length < 6) {
        const errorMsg = t("auth.validation.password_min_length", "Password must be at least 6 characters long")
        setError(errorMsg)
        toast({
          variant: "destructive",
          title: t("ui.error"),
          description: errorMsg,
        })
        setIsLoading(false)
        return
      }

      // Check for at least one lowercase letter
      if (!/[a-z]/.test(password)) {
        const errorMsg = t("auth.validation.password_lowercase", "Password must contain at least one lowercase letter (a-z)")
        setError(errorMsg)
        toast({
          variant: "destructive",
          title: t("ui.error"),
          description: errorMsg,
        })
        setIsLoading(false)
        return
      }

      // Check for at least one uppercase letter
      if (!/[A-Z]/.test(password)) {
        const errorMsg = t("auth.validation.password_uppercase", "Password must contain at least one uppercase letter (A-Z)")
        setError(errorMsg)
        toast({
          variant: "destructive",
          title: t("ui.error"),
          description: errorMsg,
        })
        setIsLoading(false)
        return
      }

      // Check for at least one number
      if (!/[0-9]/.test(password)) {
        const errorMsg = t("auth.validation.password_number", "Password must contain at least one number (0-9)")
        setError(errorMsg)
        toast({
          variant: "destructive",
          title: t("ui.error"),
          description: errorMsg,
        })
        setIsLoading(false)
        return
      }
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              email: email,
            }
          }
        })

        if (error) {
          console.error("Signup error:", error)
          throw error
        }

        if (data.user) {
          toast({
            title: t("auth.login.account_created", "Account created!"),
            description: t("auth.login.check_email_verification", "Please check your email to verify your account."),
          })
          // Optionally update profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ email: email })
            .eq('id', data.user.id)

          if (profileError) {
            console.error("Profile update error:", profileError)
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          console.error("Login error:", error)
          throw error
        }
        // navigate("/dashboard")
        navigate("/", { replace: true })
      }
   

    } catch (error: any) {
      setError(error.message || t("ui.error"))
      toast({
        variant: "destructive",
        title: t("ui.error"),
        description: error.message || t("ui.error"),
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
      toast({
        variant: "destructive",
        title: t("ui.error"),
        description: error.message || t("ui.error"),
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
            <h1 className="text-2xl font-bold">{isSignUp ? t("auth.login.create_account_title", "Create Account") : t("auth.login.welcome_back", "Welcome back")}</h1>
            <p className="text-gray-500">
              {isSignUp
                ? t("auth.login.create_account_description", "Create an account to continue")
                : t("auth.login.credentials_prompt", "Please enter your credentials to continue")}
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4 mt-4">
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
                disabled={isLoading}
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
                disabled={isLoading}
                autoComplete="current-password"
                className="bg-card"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
               {isLoading ? (
                
                t("auth.login.loading", "Signing in...")
              ) : isSignUp ? (
                t("auth.login.create_account", "Create Account")
              ) : (
                t("auth.login.sign_in", "Sign In")
              )}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full  font-bold"
              onClick={() => setIsResettingPassword(true)}
              disabled={isLoading}
            >
              {t("auth.login.forgot_password", "Forgot Password?")}
            </Button>
          </form>
          <div className="text-center text-sm">
        <Button
          variant="link"
          className="text-sm"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? t("auth.login.already_have_account", "Already have an account?") : t("auth.login.no_account", "Don't have an account?")}
        </Button>
      </div>
        </>
      )}
    </div>
  )
}
