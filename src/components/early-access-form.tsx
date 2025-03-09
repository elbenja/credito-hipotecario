import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  website: z.string(), // Honeypot field
})

type FormValues = z.infer<typeof formSchema>

export function EarlyAccessForm() {
  const { t, i18n } = useTranslation()
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      website: "", // Honeypot field
    },
  })

  async function onSubmit(data: FormValues) {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/early-access-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: data.email,
          language: i18n.language,
          website: data.website, // Pass honeypot field to Edge Function
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }

      setShowSuccess(true)
      form.reset()
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder={t('email_placeholder')}
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Honeypot field - hidden from real users */}
          <Input
            type="text"
            {...form.register("website")}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : t('notify_me')}
          </Button>
        </form>
      </Form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('success_title')}</DialogTitle>
            <DialogDescription>
              {t('success_message')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
} 