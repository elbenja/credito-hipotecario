import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { format, addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"

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
import { newRateSchema, type NewRateFormValues } from "./new-rate-schema"
import { createLocalDate } from "@/lib/utils"

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
  const queryClient = useQueryClient()
  
  useEffect(() => {
    if (!amortizationId) return
    
    const fetchRefinancingOptions = async () => {
      const { data, error } = await supabase
        .from("new_rates")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("effective_date", { ascending: true })
      
      if (error) {
        console.error("Error fetching new rates:", error)
        return
      }
      
      setRefinancingOptions(data || [])
    }
    
    fetchRefinancingOptions()

    // Subscribe to changes
    const channel = supabase
      .channel('new_rates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'new_rates',
          filter: `amortization_id=eq.${amortizationId}`
        },
        (payload) => {
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
        .from("new_rates")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Update local state
      setRefinancingOptions(prev => prev.filter(option => option.id !== id))
      
      // Invalidate queries to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["new-rates", amortizationId]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", amortizationId]
      })
      
      toast({
        title: t("payment_scenarios.new_rate_form.success_title"),
        description: t("payment_scenarios.new_rate_form.success_message"),
      })
      
      // Call onSuccess callback to notify parent components
      onSuccess?.()
    } catch (error) {
      console.error("Error deleting new rate:", error)
      toast({
        title: t("payment_scenarios.new_rate_form.error_title"),
        description: t("payment_scenarios.new_rate_form.error_message"),
        variant: "destructive",
      })
    }
  }

  const form = useForm<NewRateFormValues>({
    resolver: zodResolver(newRateSchema),
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

  const handleSubmit = async (values: NewRateFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Extract date components to create YYYY-MM-DD format without timezone issues
      const date = values.effective_date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      
      // Format as YYYY-MM-DD
      const formattedDate = `${year}-${month}-${day}`;
      
      const { data, error } = await supabase
        .from("new_rates")
        .insert([{
          amortization_id: amortizationId,
          new_interest_rate: values.new_interest_rate,
          effective_date: formattedDate,
          new_term_years: values.new_term_years,
        }])
        .select();

      if (error) {
        console.error("Error saving new rate:", error)
        throw error
      }

      // Immediately update the local state with the new option
      if (data && data.length > 0) {
        setRefinancingOptions(prev => [...prev, data[0]]);
      }

      // Invalidate queries to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["new-rates", amortizationId]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", amortizationId]
      })
      
      form.reset()
      
      // Call onSuccess callback to notify parent components
      onSuccess?.()
      
      toast({
        title: t("payment_scenarios.new_rate_form.success_title"),
        description: t("payment_scenarios.new_rate_form.success_message"),
      })
    } catch (error) {
      console.error("Error saving new rate:", error)
      toast({
        title: t("payment_scenarios.new_rate_form.error_title"),
        description: t("payment_scenarios.new_rate_form.error_message"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Refinancing Options</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className={className}>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_1fr_1fr_100px] gap-4">
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
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "remaining" ? null : parseInt(value))}
                        value={field.value?.toString() || "remaining"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="10" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remaining">{t("payment_scenarios.new_rate_form.remaining")}</SelectItem>
                          {[5, 10, 15, 20, 25, 30].map((years) => (
                            <SelectItem key={years} value={years.toString()}>
                              {t("payment_scenarios.new_rate_form.years", { value: years })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                        date={{ from: field.value || null, to: field.value || null }}
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

              <Button 
                type="submit"
                variant="outline"
                className="self-end px-3 w-[100px]"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 opacity-50" />
                <span>{t("payment_scenarios.new_rate_form.add_button")}</span>
              </Button>
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
                  <td className="p-2 text-sm">{format(createLocalDate(option.effective_date), 'MMM dd, yyyy')}</td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(option.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
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