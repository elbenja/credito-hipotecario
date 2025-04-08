import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay, subYears } from "date-fns"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import { cn, normalizeDate } from "@/lib/utils"
import { CurrencyInput } from "@/components/ui/currency-input"

import { z } from "zod"
import { formatCurrency, formatDate } from "@/lib/utils"

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
    month: z.string({
      required_error: t ? t('extra_installments_section.form.month_required', 'Month is required', { ns: 'components' }) : 'Month is required',
    }),
    day: z.string({
      required_error: t ? t('extra_installments_section.form.day_required', 'Day is required', { ns: 'components' }) : 'Day is required',
    }),
    year: z.string({
      required_error: t ? t('extra_installments_section.form.year_required', 'Year is required', { ns: 'components' }) : 'Year is required',
    }),
  }).superRefine((data, ctx) => {
    if (!firstInstallmentDate) return true;
    
    const selectedDate = new Date(
      parseInt(data.year),
      parseInt(data.month) - 1,
      parseInt(data.day),
      12, 0, 0, 0
    );
    
    if (isBefore(selectedDate, firstInstallmentDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t ? t('extra_installments_section.form.date_before_first_installment', 'Date cannot be before first installment date', { ns: 'components' }) : 'Date cannot be before first installment date',
        path: ["year"]
      });
      return false;
    }
    
    return true;
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

  // Generate month options
  const months = [
    { value: "1", label: "Jan" },
    { value: "2", label: "Feb" },
    { value: "3", label: "Mar" },
    { value: "4", label: "Apr" },
    { value: "5", label: "May" },
    { value: "6", label: "Jun" },
    { value: "7", label: "Jul" },
    { value: "8", label: "Aug" },
    { value: "9", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ];

  // Generate days options (1-31)
  const days = Array.from({ length: 31 }, (_, i) => ({ 
    value: String(i + 1), 
    label: String(i + 1) 
  }));

  // Calculate years range
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 15;
  const endYear = currentYear + 20;
  const years = Array.from(
    { length: endYear - startYear + 1 }, 
    (_, i) => ({ 
      value: String(startYear + i), 
      label: String(startYear + i) 
    })
  );

  // Create the schema with the firstInstallmentDate and translation function
  const extraInstallmentSchema = createExtraInstallmentSchema(firstInstallmentDate, t);

  const form = useForm<ExtraInstallmentFormValues>({
    resolver: zodResolver(extraInstallmentSchema),
    defaultValues: {
      amount: "",
      frequency: "one-time",
      month: String(initialDate.getMonth() + 1),
      day: String(initialDate.getDate()),
      year: String(initialDate.getFullYear()),
    },
  });

  // Function to check if a date would be before the firstInstallmentDate
  const isDateBeforeFirstInstallment = (year: number, month: number, day: number) => {
    if (!firstInstallmentDate) return false;
    
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return isBefore(date, firstInstallmentDate);
  };

  // Year validation - should disable years before firstInstallmentDate year
  const isYearDisabled = (yearValue: string) => {
    if (!firstInstallmentDate) return false;
    return parseInt(yearValue) < firstInstallmentDate.getFullYear();
  };

  // Month validation - should disable months that would result in a date before firstInstallmentDate
  const isMonthDisabled = (monthValue: string) => {
    if (!firstInstallmentDate) return false;
    
    const selectedYear = parseInt(form.watch('year'));
    const monthIndex = parseInt(monthValue) - 1;
    
    // If selected year is before firstInstallmentDate year, all months should be disabled
    // This shouldn't happen due to year validation, but adding as a safeguard
    if (selectedYear < firstInstallmentDate.getFullYear()) return true;
    
    // If selected year is the same as firstInstallmentDate year, 
    // disable months before firstInstallmentDate month
    if (selectedYear === firstInstallmentDate.getFullYear()) {
      return monthIndex < firstInstallmentDate.getMonth();
    }
    
    return false;
  };

  // Day validation - should disable days that would result in a date before firstInstallmentDate
  const isDayDisabled = (dayValue: string) => {
    if (!firstInstallmentDate) return false;
    
    const selectedYear = parseInt(form.watch('year'));
    const selectedMonth = parseInt(form.watch('month'));
    const dayNumber = parseInt(dayValue);
    
    // If selected year & month match firstInstallmentDate year & month,
    // disable days before firstInstallmentDate day
    if (selectedYear === firstInstallmentDate.getFullYear() && 
        selectedMonth === (firstInstallmentDate.getMonth() + 1)) {
      return dayNumber < firstInstallmentDate.getDate();
    }
    
    // For other months/years, check if the date is valid
    // This is a redundant check as year/month validation should prevent this case
    return isDateBeforeFirstInstallment(selectedYear, selectedMonth, dayNumber);
  };

  useEffect(() => {
    if (firstInstallmentDate && form) {
      // When the year changes, validate the month and day
      const yearSubscription = form.watch((value, { name }) => {
        if (name === 'year' || name === 'month') {
          // Revalidate fields that depend on this
          form.trigger(['month', 'day']);
        }
      });
      
      return () => yearSubscription.unsubscribe();
    }
  }, [form, firstInstallmentDate]);

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    // Convert the month, day, year to a Date object
    const month = parseInt(values.month) - 1; // Months are 0-indexed in JS
    const day = parseInt(values.day);
    const year = parseInt(values.year);
    
    // Create a date object with noon time to avoid timezone issues
    const date = new Date(year, month, day, 12, 0, 0, 0);
    
    // Final validation check before submission
    if (firstInstallmentDate && isBefore(date, firstInstallmentDate)) {
      form.setError("year", { 
        type: "custom", 
        message: t('extra_installments_section.form.date_before_first_installment', 'Date cannot be before first installment date', { ns: 'components' }) 
      });
      return;
    }
    
    // Log dates for debugging
    console.log('Extra installment form - Date components:', { year, month: month + 1, day });
    console.log('Extra installment form - Constructed date:', date);
    
    // Pass to the parent component
    onSubmit({
      amount: values.amount,
      frequency: values.frequency,
      start_date: date
    });
    
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {firstInstallmentDate && (
          <div className="text-sm text-muted-foreground mb-2">
            {t('extra_installments_section.form.min_date_notice', 
               'Date must be on or after {{date}}', 
               { 
                 date: formatDate(firstInstallmentDate),
                 ns: 'components' 
               }
            )}
          </div>
        )}
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

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('extra_installments_section.form.month', 'Month', { ns: 'components' })}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem 
                        key={month.value} 
                        value={month.value}
                        disabled={isMonthDisabled(month.value)}
                      >
                        {month.label}
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
            name="day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('extra_installments_section.form.day', 'Day', { ns: 'components' })}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem 
                        key={day.value} 
                        value={day.value}
                        disabled={isDayDisabled(day.value)}
                      >
                        {day.label}
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
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('extra_installments_section.form.year', 'Year', { ns: 'components' })}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem 
                        key={year.value} 
                        value={year.value} 
                        disabled={isYearDisabled(year.value)}
                      >
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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