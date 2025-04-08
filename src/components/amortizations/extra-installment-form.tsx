import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay, subYears } from "date-fns"
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

const extraInstallmentSchema = z.object({
  amount: z.string()
    .min(1, "extra_installments_section.form.amount_required")
    .refine((val) => {
      const amount = parseFloat(val.replace(/[^0-9.]/g, ""))
      return !isNaN(amount) && amount > 0
    }, "extra_installments_section.form.amount_positive"),
  frequency: z.enum(["monthly", "one-time"]),
  month: z.string({
    required_error: "extra_installments_section.form.month_required",
  }),
  day: z.string({
    required_error: "extra_installments_section.form.day_required",
  }),
  year: z.string({
    required_error: "extra_installments_section.form.year_required",
  }),
})

type ExtraInstallmentFormValues = z.infer<typeof extraInstallmentSchema>

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

  // Get the initial date based on priority
  const getInitialDate = () => {
    if (lastExtraInstallmentDate) {
      return new Date(
        lastExtraInstallmentDate.getFullYear(),
        lastExtraInstallmentDate.getMonth(),
        lastExtraInstallmentDate.getDate(),
        12, 0, 0, 0
      );
    }
    if (firstInstallmentDate) {
      return new Date(
        firstInstallmentDate.getFullYear(),
        firstInstallmentDate.getMonth(),
        firstInstallmentDate.getDate(),
        12, 0, 0, 0
      );
    }
    return new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
      12, 0, 0, 0
    );
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

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    // Convert the month, day, year to a Date object
    const month = parseInt(values.month) - 1; // Months are 0-indexed in JS
    const day = parseInt(values.day);
    const year = parseInt(values.year);
    
    // Create a date object with noon time to avoid timezone issues
    const date = new Date(year, month, day, 12, 0, 0, 0);
    
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
                      <SelectItem key={month.value} value={month.value}>
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
                      <SelectItem key={day.value} value={day.value}>
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
                      <SelectItem key={year.value} value={year.value}>
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
