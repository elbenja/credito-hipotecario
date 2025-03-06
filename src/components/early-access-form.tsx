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

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  website: z.string(), // Honeypot field
})

type FormValues = z.infer<typeof formSchema>

export function EarlyAccessForm() {
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
      
      // If honeypot field is filled, silently reject
      if (data.website) {
        setShowSuccess(true)
        return
      }

      const { error } = await supabase
        .from("early_access_signups")
        .insert([
          {
            email: data.email,
            language: "en", // Default to English for now
            ip_address: "", // We'll need to get this from the server
            status: "unverified",
          },
        ])

      if (error) throw error

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
                    placeholder="name@example.com"
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
            className="w-full bg-[hsl(41,89%,61%)] hover:bg-[hsl(41,89%,55%)]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Notify Me!"}
          </Button>
        </form>
      </Form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thank you for your interest!</DialogTitle>
            <DialogDescription>
              We've received your email and will notify you as soon as we launch the beta version.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
} 