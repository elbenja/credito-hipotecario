import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { addYears, subWeeks, startOfDay, isBefore, isAfter, isSameDay } from "date-fns"
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

import { z } from "zod"
import { formatCurrency, cn, formatDate } from "@/lib/utils"

const extraInstallmentSchema = z.object({
  amount: z.string()
    .min(1, "extra_installments_section.form.amount_required")
    .refine((val) => {
      const amount = parseFloat(val.replace(/[^0-9.]/g, ""))
      return !isNaN(amount) && amount > 0
    }, "extra_installments_section.form.amount_positive"),
  frequency: z.enum(["monthly", "one-time"]),
  start_date: z.date({
    required_error: "extra_installments_section.form.start_date_required",
  }),
})

type ExtraInstallmentFormValues = z.infer<typeof extraInstallmentSchema>

interface ExtraInstallmentFormProps {
  onSubmit: (values: ExtraInstallmentFormValues) => void
  isLoading?: boolean
  loanAmount: number
  currency: "USD" | "PEN"
}

export function ExtraInstallmentForm({ onSubmit, isLoading, loanAmount, currency }: ExtraInstallmentFormProps) {
  const { t } = useTranslation()
  const form = useForm<ExtraInstallmentFormValues>({
    resolver: zodResolver(extraInstallmentSchema),
    defaultValues: {
      amount: "",
      frequency: "one-time",
      start_date: new Date(),
    },
  })

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

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    // Clone and normalize the date to ensure consistent date handling
    // First, convert to a date-only string (YYYY-MM-DD)
    const normalizedDate = new Date(values.start_date);
    // Set to noon UTC to avoid any timezone boundary issues
    normalizedDate.setUTCHours(12, 0, 0, 0);
    
    // Pass the normalized date to parent
    onSubmit({
      ...values,
      start_date: normalizedDate
    });
    
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px] gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("extra_installments_section.form.amount")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder={t("extra_installments_section.form.amount_placeholder")}
                      className="pl-8"
                      {...field}
                      onChange={(e) => {
                        // Remove any non-numeric characters except decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, "")
                        // Ensure only one decimal point
                        const parts = value.split('.')
                        const formattedValue = parts.length > 1 
                          ? `${parts[0]}.${parts.slice(1).join('')}`
                          : value
                        field.onChange(formattedValue)
                      }}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                      {currency === "USD" ? "$" : "S/"}
                    </div>
                  </div>
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
                <FormLabel>{t("extra_installments_section.form.frequency")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value: "monthly" | "one-time") => field.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("extra_installments_section.form.frequency_placeholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">{t("extra_installments_section.form.frequency_monthly")}</SelectItem>
                    <SelectItem value="one-time">{t("extra_installments_section.form.frequency_one_time")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("extra_installments_section.form.first_date")}</FormLabel>
                <FormControl>
                  <CalendarDatePicker
                    date={{ from: field.value, to: field.value }}
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
            disabled={isLoading}
            variant="outline"
            className="self-end px-3 w-[100px]"
          >
            <Plus className="h-4 w-4" />
            {t("extra_installments_section.form.add_button")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
