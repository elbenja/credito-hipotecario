
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { refinancingOptionSchema, type RefinancingOptionFormValues } from "./refinancing-option-schema"
import { useInterestRateLimits } from "@/hooks/use-interest-rate-limits"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface RefinancingOptionFormProps {
  amortizationId: string
  onSuccess?: () => void
}

export function RefinancingOptionForm({
  amortizationId,
  onSuccess
}: RefinancingOptionFormProps) {
  const { data: interestRateLimits } = useInterestRateLimits()
  const { toast } = useToast()

  const form = useForm<RefinancingOptionFormValues>({
    resolver: zodResolver(refinancingOptionSchema),
    defaultValues: {
      new_interest_rate: "",
      effective_date: new Date(),
      new_term_years: "",
    },
  })

  async function onSubmit(values: RefinancingOptionFormValues) {
    try {
      const { error } = await supabase
        .from("refinancing_options")
        .insert({
          amortization_id: amortizationId,
          new_interest_rate: Number(values.new_interest_rate),
          effective_date: format(values.effective_date, 'yyyy-MM-dd'),
          new_term_years: values.new_term_years ? Number(values.new_term_years) : null,
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Refinancing option added successfully",
      })

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error adding refinancing option:", error)
      toast({
        title: "Error",
        description: "Failed to add refinancing option. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="new_interest_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter rate..." 
                    {...field}
                    type="number"
                    step="0.1"
                    min={interestRateLimits?.min_rate}
                    max={interestRateLimits?.max_rate}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="effective_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Effective Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
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
                      disabled={(date) =>
                        date <= new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_term_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Term (Years)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Optional..." 
                    {...field}
                    type="number"
                    min={1}
                    max={30}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit">Add Refinancing Option</Button>
      </form>
    </Form>
  )
}
