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

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    // If user is already logged in, redirect to dashboard
    if (user) {
      navigate("/dashboard")
      return
    }

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

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
            title: "Account created!",
            description: "Please check your email to verify your account.",
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
        navigate("/dashboard")
      }
    } catch (error: any) {
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

  return (
    <div className="grid gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">
          {t("auth.login.early_access")}
        </h1>
        <p className="text-md">
          {t("auth.login.credentials_prompt")}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.login.email")}</Label>
          <Input
            id="email"
            name="email"
            placeholder={t("auth.login.email_placeholder")}
            required
            type="email"
            disabled={isLoading}
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
          />
        </div>
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            t("auth.login.loading")
          ) : isSignUp ? (
            t("auth.login.create_account")
          ) : (
            t("auth.login.sign_in")
          )}
        </Button>
      </form>
      <div className="text-center text-sm">
        {t("auth.login.reset_password_prompt")}
      </div>
    </div>
  )
}
