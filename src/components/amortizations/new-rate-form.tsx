import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, Check } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState } from "react"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { refinancingOptionSchema, type RefinancingOptionFormValues } from "./refinancing-option-schema"

interface NewRateFormProps {
  amortizationId: string
  onSuccess?: () => void
  className?: string
}

export function NewRateForm({
  amortizationId,
  onSuccess,
  className
}: NewRateFormProps) {
  const { toast } = useToast()
  const form = useForm<RefinancingOptionFormValues>({
    resolver: zodResolver(refinancingOptionSchema),
    defaultValues: {
      new_interest_rate: 0,
      effective_date: undefined,
      new_term_years: null,
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(values: RefinancingOptionFormValues) {
    if (!amortizationId) return

    try {
      setIsSubmitting(true)

      const { error } = await supabase
        .from("refinancing_options")
        .insert({
          amortization_id: amortizationId,
          new_interest_rate: values.new_interest_rate,
          effective_date: format(values.effective_date, 'yyyy-MM-dd'),
          new_term_years: values.new_term_years,
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Refinancing option saved successfully",
      })

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving refinancing option:", error)
      toast({
        title: "Error",
        description: "Failed to save refinancing option. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Refinancing Options</h3>
          <div className="grid grid-cols-[1fr_1fr_1fr_88px] gap-4">
            <FormField
              control={form.control}
              name="new_interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Interest Rate</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="9" 
                        {...field}
                        type="number"
                        step="0.1"
                        min={4}
                        max={18}
                        className="pl-8"
                        value={field.value || ""}
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                        %
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_term_years"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Term</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "remaining" ? null : parseInt(value))}
                    value={field.value?.toString() || "remaining"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="remaining">Remaining</SelectItem>
                      <SelectItem value="5">5 years</SelectItem>
                      <SelectItem value="10">10 years</SelectItem>
                      <SelectItem value="15">15 years</SelectItem>
                      <SelectItem value="20">20 years</SelectItem>
                      <SelectItem value="25">25 years</SelectItem>
                      <SelectItem value="30">30 years</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effective_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "MMM d, yyyy")
                          ) : (
                            "Pick a date"
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date <= new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="self-end">
              <Button 
                type="submit"
                variant="outline"
                className="px-3 w-[88px]"
                disabled={isSubmitting || !form.formState.isValid}
              >
                <Check className="h-4 w-4" />
                {isSubmitting ? "..." : "OK"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
} 