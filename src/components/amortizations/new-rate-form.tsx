import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

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
      effective_date: new Date(),
      new_term_years: null,
    },
  })

  async function onSubmit(values: RefinancingOptionFormValues) {
    try {
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
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="new_interest_rate"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>New Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="9%" 
                    {...field}
                    type="number"
                    step="0.1"
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_term_years"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>New Term</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "remaining" ? null : parseInt(value))}
                  value={field.value?.toString() || "remaining"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term..." />
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
              <FormItem className="space-y-2">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start text-left font-normal form-control-focus"
                      >
                        {field.value ? (
                          format(field.value, "MMM d, yyyy")
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
                      disabled={(date) => date <= new Date()}
                      initialFocus
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  )
} 