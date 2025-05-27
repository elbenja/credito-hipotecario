import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
// import { Plus } from "lucide-react"
import { addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay, subYears, lastDayOfMonth } from "date-fns"
import { useTranslation } from "react-i18next"
// import { useEffect, useMemo } from "react"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { MonthYearPicker } from "@/components/ui/month-year-picker";
// import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import { cn, normalizeDate } from "@/utils/utils"
import { CurrencyInput } from "@/components/ui/currency-input"

import { z } from "zod"
// import { formatCurrency, formatDate } from "@/utils/utils"

// Create a function to generate the schema with dynamic validation based on firstInstallmentDate
const createExtraInstallmentSchema = (firstInstallmentDate?: Date, t?: any) => {
  return z.object({
    amount: z.string()
      .min(1, t ? t('extra_installments_section.form.amount_required', 'Amount is required', { ns: 'components' }) : 'Amount is required')
      .refine((val) => {
        const amount = parseFloat(val.replace(/[^0-9.]/g, ""))
        return !isNaN(amount) && amount > 0
      }, t ? t('extra_installments_section.form.amount_positive', 'Amount must be positive', { ns: 'components' }) : 'Amount must be positive'),
    frequency: z.enum(["monthly", "one-time"]),
    startDate: z.date({
      required_error: t ? t('extra_installments_section.form.date_required', 'Date is required', { ns: 'components' }) : 'Date is required',
    }).refine((date) => {
      if (!firstInstallmentDate) return true;
      return !isBefore(date, firstInstallmentDate);
    }, {
      message: t ? t('extra_installments_section.form.date_before_first_installment', 'Date cannot be before first installment date', { ns: 'components' }) : 'Date cannot be before first installment date',
    }),
  });
};

type ExtraInstallmentFormValues = z.infer<ReturnType<typeof createExtraInstallmentSchema>>;

interface ExtraInstallmentFormProps {
  onSubmit: (values: any) => void
  isLoading?: boolean
  loanAmount: number
  currency: "USD" | "PEN"
  lastExtraInstallmentDate?: Date
  firstInstallmentDate?: Date
}

export function ExtraInstallmentForm({ 
  onSubmit, 
  isLoading, 
  loanAmount, 
  currency,
  lastExtraInstallmentDate,
  firstInstallmentDate 
}: ExtraInstallmentFormProps) {
  const { t } = useTranslation(['components'])

  // Get the initial date based on priority - prefer a date on or after firstInstallmentDate
  const getInitialDate = () => {
    // Start with a base date (today or last installment date)
    let initialDate;
    
    if (lastExtraInstallmentDate) {
      initialDate = new Date(
        lastExtraInstallmentDate.getFullYear(),
        lastExtraInstallmentDate.getMonth(),
        lastExtraInstallmentDate.getDate(),
        12, 0, 0, 0
      );
    } else {
      initialDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        12, 0, 0, 0
      );
    }
    
    // If we have a firstInstallmentDate and the initial date is before it,
    // use the firstInstallmentDate instead
    if (firstInstallmentDate && isBefore(initialDate, firstInstallmentDate)) {
      return new Date(
        firstInstallmentDate.getFullYear(),
        firstInstallmentDate.getMonth(),
        firstInstallmentDate.getDate(),
        12, 0, 0, 0
      );
    }
    
    return initialDate;
  };

  const initialDate = getInitialDate();

  // Create the schema with the firstInstallmentDate and translation function
  const extraInstallmentSchema = createExtraInstallmentSchema(firstInstallmentDate, t);

  const form = useForm<ExtraInstallmentFormValues>({
    resolver: zodResolver(extraInstallmentSchema),
    defaultValues: {
      amount: "",
      frequency: "one-time",
      startDate: initialDate,
    },
  });

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    // Get the target day from the firstInstallmentDate for consistency
    const targetDay = firstInstallmentDate ? firstInstallmentDate.getDate() : values.startDate.getDate();
    
    // Create the final date using the selected month/year but with the target day
    let finalDate = new Date(
      values.startDate.getFullYear(),
      values.startDate.getMonth(),
      targetDay,
      12, 0, 0, 0
    );
    
    // Check if the month rolled over (e.g., Feb 31 became Mar 2/3)
    if (finalDate.getMonth() !== values.startDate.getMonth()) {
      // If month rolled over, the targetDay is invalid for the selected month.
      // Get the last valid day of the intended month.
      const lastDay = lastDayOfMonth(new Date(values.startDate.getFullYear(), values.startDate.getMonth(), 1, 12, 0, 0, 0));
      finalDate = new Date(values.startDate.getFullYear(), values.startDate.getMonth(), lastDay.getDate(), 12, 0, 0, 0);
    }

    // Normalize the date to handle timezone issues
    const normalizedDate = normalizeDate(finalDate);
    
    // Final validation check before submission
    if (firstInstallmentDate && isBefore(normalizedDate, firstInstallmentDate)) {
      form.setError("startDate", {
        type: "custom", 
        message: t('extra_installments_section.form.date_before_first_installment', 'Calculated date cannot be before first installment date', { ns: 'components' }) 
      });
      return;
    }
    
    // Pass to the parent component with the normalized date
    onSubmit({
      amount: values.amount,
      frequency: values.frequency,
      start_date: normalizedDate
    });
    
    // Reset form
    form.reset({
      amount: "",
      frequency: "one-time",
      startDate: values.startDate, // Keep the same date for convenience
    }); 
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('extra_installments_section.form.amount', 'Amount', { ns: 'components' })}</FormLabel>
              <FormControl>
                <CurrencyInput 
                  value={field.value || ''}
                  onChange={field.onChange}
                  currency={currency}
                  placeholder={t('extra_installments_section.form.amount_placeholder', 'Enter amount', { ns: 'components' })}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('extra_installments_section.form.frequency', 'Frequency', { ns: 'components' })}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value: "monthly" | "one-time") => field.onChange(value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('extra_installments_section.form.frequency_placeholder', 'Select frequency', { ns: 'components' })} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">{t('extra_installments_section.form.frequency_monthly', 'Monthly', { ns: 'components' })}</SelectItem>
                  <SelectItem value="one-time">{t('extra_installments_section.form.frequency_one_time', 'One-time', { ns: 'components' })}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <MonthYearPicker
              field={field}
              form={form}
              minDate={firstInstallmentDate}
              labelKey="extra_installments_section.form.start_date"
              ns="components"
            />
          )}
        />

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full"
          >
            {t('ui.confirm', 'Confirm', { ns: 'global' })}
          </Button>
        </div>
      </form>
    </Form>
  )
} 