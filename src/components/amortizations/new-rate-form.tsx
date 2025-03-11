import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Trash2 } from "lucide-react"
import { format, addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

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
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { refinancingOptionSchema, type RefinancingOptionFormValues } from "./refinancing-option-schema"

interface NewRateFormProps {
  amortizationId: string
  onSuccess?: () => void
  className?: string
}

interface RefinancingOption {
  id: string
  new_interest_rate: number
  effective_date: string
  new_term_years: number | null
}

export function NewRateForm({
  amortizationId,
  onSuccess,
  className
}: NewRateFormProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [refinancingOptions, setRefinancingOptions] = useState<RefinancingOption[]>([])
  
  useEffect(() => {
    if (!amortizationId) return
    
    const fetchRefinancingOptions = async () => {
      console.log("Fetching refinancing options for amortization:", amortizationId)
      const { data, error } = await supabase
        .from("refinancing_options")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("effective_date", { ascending: true })
      
      if (error) {
        console.error("Error fetching refinancing options:", error)
        return
      }
      
      console.log("Fetched refinancing options:", data)
      setRefinancingOptions(data)
    }
    
    fetchRefinancingOptions()

    // Subscribe to changes
    const channel = supabase
      .channel('refinancing_options_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refinancing_options',
          filter: `amortization_id=eq.${amortizationId}`
        },
        (payload) => {
          console.log('Change received:', payload)
          fetchRefinancingOptions()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [amortizationId])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("refinancing_options")
        .delete()
        .eq("id", id)

      if (error) throw error

      setRefinancingOptions(prev => prev.filter(option => option.id !== id))
      toast({
        title: t("payment_scenarios.new_rate_form.success_title"),
        description: t("payment_scenarios.new_rate_form.success_message"),
      })
    } catch (error) {
      console.error("Error deleting refinancing option:", error)
      toast({
        title: t("payment_scenarios.new_rate_form.error_title"),
        description: t("payment_scenarios.new_rate_form.error_message"),
        variant: "destructive",
      })
    }
  }

  const form = useForm<RefinancingOptionFormValues>({
    resolver: zodResolver(refinancingOptionSchema),
    defaultValues: {
      new_interest_rate: undefined,
      effective_date: undefined,
      new_term_years: null,
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get the date boundaries
  const lastWeek = startOfDay(subWeeks(new Date(), 1));
  const thirtyYearsFromNow = startOfDay(addYears(new Date(), 30));

  // Calculate years range from last week to 30 years ahead
  const startYear = lastWeek.getFullYear();
  const endYear = thirtyYearsFromNow.getFullYear();
  const yearsRange = endYear - startYear + 1;

  // Function to determine if a date should be disabled
  const isDateDisabled = (date: Date) => {
    const startOfDate = startOfDay(date);
    return (
      isBefore(startOfDate, lastWeek) || 
      isAfter(startOfDate, thirtyYearsFromNow) ||
      isSameDay(startOfDate, lastWeek) || 
      isSameDay(startOfDate, thirtyYearsFromNow)
    );
  };

  async function onSubmit(values: RefinancingOptionFormValues) {
    if (!amortizationId) return

    try {
      setIsSubmitting(true)
      console.log("Submitting new refinancing option:", { ...values, amortization_id: amortizationId })

      const { data, error } = await supabase
        .from("refinancing_options")
        .insert({
          amortization_id: amortizationId,
          new_interest_rate: values.new_interest_rate,
          effective_date: format(values.effective_date, 'yyyy-MM-dd'),
          new_term_years: values.new_term_years,
        })
        .select()

      if (error) throw error

      console.log("Successfully added refinancing option:", data)
      
      toast({
        title: t("payment_scenarios.new_rate_form.success_title"),
        description: t("payment_scenarios.new_rate_form.success_message"),
      })

      // Fetch updated data
      const { data: updatedData, error: fetchError } = await supabase
        .from("refinancing_options")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("effective_date", { ascending: true })

      if (fetchError) {
        console.error("Error fetching updated data:", fetchError)
      } else {
        console.log("Updated refinancing options:", updatedData)
        setRefinancingOptions(updatedData)
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving refinancing option:", error)
      toast({
        title: t("payment_scenarios.new_rate_form.error_title"),
        description: t("payment_scenarios.new_rate_form.error_message"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("payment_scenarios.new_rate_form.title")}</h3>
            <div className="grid grid-cols-[1fr_1fr_1fr_88px] gap-4">
              <FormField
                control={form.control}
                name="new_interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("payment_scenarios.new_rate_form.new_interest_rate")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="" 
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
                    <FormLabel>{t("payment_scenarios.new_rate_form.new_term")}</FormLabel>
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
                        <SelectItem value="remaining">{t("payment_scenarios.new_rate_form.remaining")}</SelectItem>
                        {[5, 10, 15, 20, 25, 30].map((years) => (
                          <SelectItem key={years} value={years.toString()}>
                            {t("payment_scenarios.new_rate_form.years", { value: years })}
                          </SelectItem>
                        ))}
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
                    <FormLabel>{t("payment_scenarios.new_rate_form.start_date")}</FormLabel>
                    <FormControl>
                      <CalendarDatePicker
                        date={{ from: field.value || new Date(), to: field.value || new Date() }}
                        onDateSelect={({ from }) => field.onChange(from)}
                        numberOfMonths={1}
                        closeOnSelect={true}
                        variant="outline"
                        yearsRange={yearsRange}
                        fromYear={startYear}
                        disabled={isDateDisabled}
                        className={cn(
                          "w-full justify-start text-left font-normal form-control-focus",
                          !field.value && "text-muted-foreground"
                        )}
                      />
                    </FormControl>
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
                  {isSubmitting ? t("payment_scenarios.new_rate_form.saving") : t("payment_scenarios.new_rate_form.add_button")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("payment_scenarios.new_rate_form.table.number")}</th>
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("payment_scenarios.new_rate_form.table.interest_rate")}</th>
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("payment_scenarios.new_rate_form.table.new_term")}</th>
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t("payment_scenarios.new_rate_form.table.start_date")}</th>
              <th className="p-2 text-left font-medium w-[50px] text-xs text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {refinancingOptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-2 text-center text-sm text-muted-foreground">
                  {t("payment_scenarios.new_rate_form.no_options")}
                </td>
              </tr>
            ) : (
              refinancingOptions.map((option, index) => (
                <tr key={option.id} className="border-b last:border-0">
                  <td className="p-2 text-sm">{index + 1}</td>
                  <td className="p-2 text-sm">{option.new_interest_rate}%</td>
                  <td className="p-2 text-sm">{option.new_term_years ? t("payment_scenarios.new_rate_form.years", { value: option.new_term_years }) : t("payment_scenarios.new_rate_form.remaining")}</td>
                  <td className="p-2 text-sm">{format(new Date(option.effective_date), 'MMM dd, yyyy')}</td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(option.id)}
                      className="h-8 w-8"
                      title={t("payment_scenarios.new_rate_form.table.delete_tooltip")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 