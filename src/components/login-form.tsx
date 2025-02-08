
"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

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
        title: "Error",
        description: error.message || "An error occurred during authentication",
      })
      console.error("Auth error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{isSignUp ? "Create an account" : "Welcome back"}</h1>
        <p className="text-gray-500">
          {isSignUp
            ? "Enter your email below to create your account"
            : "Enter your credentials to access your account"}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            placeholder="m@example.com"
            required
            type="email"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
            "Loading..."
          ) : isSignUp ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      <div className="text-center text-sm">
        <Button
          variant="link"
          className="text-sm"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </Button>
      </div>
    </div>
  )
}
