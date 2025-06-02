import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { format, addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay, isValid, lastDayOfMonth, addMonths } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { Controller } from "react-hook-form"

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
import { MonthYearPicker } from "@/components/ui/month-year-picker"
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
import { cn, formatDate, createLocalDate, normalizeDate } from "@/utils/utils"
import { newRateSchema, type NewRateFormValues } from "@/components/mortgages/new-rate-schema"

interface NewRateFormProps {
  mortgageId: string
  onSuccess?: () => void
  className?: string
  firstInstallmentDate?: Date
}

interface RefinancingOption {
  id: string
  new_interest_rate: number
  effective_date: string
  new_term_years: number | null
}

export function NewRateForm({
  mortgageId,
  onSuccess,
  className,
  firstInstallmentDate
}: NewRateFormProps) {
  const { toast } = useToast()
  const { t } = useTranslation(['components'])
  const [refinancingOptions, setRefinancingOptions] = useState<RefinancingOption[]>([])
  const queryClient = useQueryClient()
  
  useEffect(() => {
    if (!mortgageId) return
    
    const fetchRefinancingOptions = async () => {
      const { data, error } = await supabase
        .from("new_rates")
        .select("*")
        .eq("mortgage_id", mortgageId)
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
          filter: `mortgage_id=eq.${mortgageId}`
        },
        (payload) => {
          fetchRefinancingOptions()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [mortgageId])

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
        queryKey: ["new-rates", mortgageId]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", mortgageId]
      })
      
      toast({
        title: t('payment_scenarios.new_rate_form.success_title', 'Success', { ns: 'components' }),
        description: t('payment_scenarios.new_rate_form.success_message', 'Rate updated successfully', { ns: 'components' }),
      })
      
      // Call onSuccess callback to notify parent components
      onSuccess?.()
    } catch (error) {
      console.error("Error deleting new rate:", error)
      toast({
        title: t('payment_scenarios.new_rate_form.error_title', 'Error', { ns: 'components' }),
        description: t('payment_scenarios.new_rate_form.error_message', 'Failed to update rate', { ns: 'components' }),
        variant: "destructive",
      })
    }
  }

  // Get the date boundaries
  const lastWeek = startOfDay(subWeeks(new Date(), 1));
  const thirtyYearsFromNow = startOfDay(addYears(new Date(), 30));

  // Get the initial date based on priority
  // const getInitialDate = () => {
  //   // 1. Last chronological date from refinancing options
  //   if (refinancingOptions.length > 0) {
  //     try {
  //       const lastDate = refinancingOptions
  //         .map(option => createLocalDate(option.effective_date))
  //         .filter(date => isValid(date))
  //         .sort((a, b) => b.getTime() - a.getTime())[0];
        
  //       if (lastDate && isValid(lastDate)) {
  //         return lastDate;
  //       }
  //     } catch (error) {
  //       console.error("Error parsing dates from refinancing options:", error);
  //     }
  //   }
    
  //   // 2. First installment date if available
  //   if (firstInstallmentDate && isValid(firstInstallmentDate)) {
  //     try {
  //       const date = createLocalDate(firstInstallmentDate.toISOString().split('T')[0]);
  //       if (isValid(date)) {
  //         return date;
  //       }
  //     } catch (error) {
  //       console.error("Error using firstInstallmentDate:", error);
  //     }
  //   }
    
  //   // 3. Today's date as fallback
  //   const today = new Date();
  //   return createLocalDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  // };
// Get the initial date based on priority
const getInitialDate = () => {
  // 1. Last chronological date from refinancing options
  if (refinancingOptions.length > 0) {
    try {
      const lastDate = refinancingOptions
        .map(option => createLocalDate(option.effective_date))
        .filter(date => isValid(date))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      
      if (lastDate && isValid(lastDate)) {
        return lastDate;
      }
    } catch (error) {
      console.error("Error parsing dates from refinancing options:", error);
    }
  }
  
  // 2. First installment date + 1 month if available (to respect minDate logic)
  if (firstInstallmentDate && isValid(firstInstallmentDate)) {
    try {
      const nextMonth = addMonths(firstInstallmentDate, 1);
      const date = createLocalDate(nextMonth.toISOString().split('T')[0]);
      if (isValid(date)) {
        return date;
      }
    } catch (error) {
      console.error("Error using firstInstallmentDate:", error);
    }
  }
  
  // 3. Today's date as fallback
  const today = new Date();
  return createLocalDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
};

  const form = useForm<NewRateFormValues>({
    resolver: zodResolver(newRateSchema),
    defaultValues: {
      new_interest_rate: undefined,
      effective_date: getInitialDate(),
      new_term_years: null,
    },
  })

  // Update the form's date when refinancingOptions changes
  useEffect(() => {
    const newDate = getInitialDate();
    form.setValue("effective_date", newDate);
  }, [refinancingOptions]);

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (values: NewRateFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Get the target day from the firstInstallmentDate for consistency
      const targetDay = firstInstallmentDate ? firstInstallmentDate.getDate() : values.effective_date.getDate();
      
      // Create the final date using the selected month/year but with the target day
      let finalDate = new Date(
        values.effective_date.getFullYear(),
        values.effective_date.getMonth(),
        targetDay,
        12, 0, 0, 0
      );
      
      // Check if the month rolled over (e.g., Feb 31 became Mar 2/3)
      if (finalDate.getMonth() !== values.effective_date.getMonth()) {
        // If month rolled over, the targetDay is invalid for the selected month.
        // Get the last valid day of the intended month.
        const lastDay = lastDayOfMonth(new Date(values.effective_date.getFullYear(), values.effective_date.getMonth(), 1, 12, 0, 0, 0));
        finalDate = new Date(values.effective_date.getFullYear(), values.effective_date.getMonth(), lastDay.getDate(), 12, 0, 0, 0);
      }

      // Normalize the date to handle timezone issues
      const normalizedDate = normalizeDate(finalDate);
      
      // Use the normalized date's ISO string to get YYYY-MM-DD format
      const formattedDate = normalizedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("new_rates")
        .insert([{
          mortgage_id: mortgageId,
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
        queryKey: ["new-rates", mortgageId]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", mortgageId]
      })
      
      form.reset()
      
      // Call onSuccess callback to notify parent components
      onSuccess?.()
      
      toast({
        title: t('payment_scenarios.new_rate_form.success_title', 'Success', { ns: 'components' }),
        description: t('payment_scenarios.new_rate_form.success_message', 'Rate updated successfully', { ns: 'components' }),
      })
    } catch (error) {
      console.error("Error saving new rate:", error)
      toast({
        title: t('payment_scenarios.new_rate_form.error_title', 'Error', { ns: 'components' }),
        description: t('payment_scenarios.new_rate_form.error_message', 'Failed to update rate', { ns: 'components' }),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-2 inline-flex justify-start items-center gap-8">
        <h3 className="text-lg font-medium">{t('payment_scenarios.new_rate_form.refinancing_options', 'Refinancing Options', { ns: 'components' })}</h3>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('payment_scenarios.new_rate_form.add_button', 'Add', { ns: 'components' })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className={className}>
                <div className="space-y-4"> 
                  <FormField
                    control={form.control}
                    name="new_interest_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('payment_scenarios.new_rate_form.new_interest_rate', 'New Interest Rate', { ns: 'components' })}</FormLabel>
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
                              value={field.value === undefined ? "" : field.value}
                              onChange={e => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : parseFloat(value));
                              }}
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
                        <FormLabel>{t('payment_scenarios.new_rate_form.new_term', 'New Term', { ns: 'components' })}</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "remaining" ? null : parseInt(value))}
                            value={field.value?.toString() || "remaining"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="10" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="remaining">{t('payment_scenarios.new_rate_form.remaining', 'Remaining Term', { ns: 'components' })}</SelectItem>
                              {[5, 10, 15, 20, 25, 30].map((years) => (
                                <SelectItem key={years} value={years.toString()}>
                                  {t('payment_scenarios.new_rate_form.years', '{{value}} years', { ns: 'components', value: years })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="effective_date"
                    render={({ field }) => (
                      <MonthYearPicker
                        field={field}
                        form={form}
                         // minDate={firstInstallmentDate}
                         minDate={firstInstallmentDate ? addMonths(firstInstallmentDate, 1) : undefined}
                        maxDate={thirtyYearsFromNow}
                        labelKey="payment_scenarios.new_rate_form.start_date"
                        ns="components"
                      />
                    )}
                  />

{/* <p className="text-xs text-muted-foreground">{firstInstallmentDate?.toISOString()}</p> */}

                  <Button 
                    type="submit"
                    className="w-full mt-2"
                    disabled={isSubmitting}
                  >
                    {t('ui.confirm', 'Confirm', { ns: 'global' })}
                  </Button>
                </div>
              </form>
            </Form>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('payment_scenarios.new_rate_form.table.number', '#', { ns: 'components' })}</th>
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('payment_scenarios.new_rate_form.table.interest_rate', 'Interest Rate', { ns: 'components' })}</th>
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('payment_scenarios.new_rate_form.table.new_term', 'New Term', { ns: 'components' })}</th>
              <th className="p-2 text-left font-medium text-xs text-muted-foreground">{t('payment_scenarios.new_rate_form.table.start_date', 'Start Date', { ns: 'components' })}</th>
              <th className="p-2 text-left font-medium w-[50px] text-xs text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {refinancingOptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center ">
                  {t('payment_scenarios.new_rate_form.no_options', 'No refinancing options added yet', { ns: 'components' })}
                </td>
              </tr>
            ) : (
              refinancingOptions.map((option, index) => (
                <tr key={option.id} className="border-b last:border-0">
                  <td className="p-2 text-sm">{index + 1}</td>
                  <td className="p-2 text-sm">{option.new_interest_rate}%</td>
                  <td className="p-2 text-sm">
                    {option.new_term_years 
                      ? t('payment_scenarios.new_rate_form.years', '{{value}} years', { ns: 'components', value: option.new_term_years })
                      : t('payment_scenarios.new_rate_form.remaining', 'Remaining Term', { ns: 'components' })}
                  </td>
                  <td className="p-2 text-sm">
                    {(() => {
                      try {
                        const date = createLocalDate(option.effective_date);
                        return isValid(date) ? formatDate(date) : option.effective_date;
                      } catch (error) {
                        console.error("Error formatting date:", error);
                        return option.effective_date;
                      }
                    })()}
                  </td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(option.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title={t('payment_scenarios.new_rate_form.table.delete_tooltip', 'Delete rate', { ns: 'components' })}
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