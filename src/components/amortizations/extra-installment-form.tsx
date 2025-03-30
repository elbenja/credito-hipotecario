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
  const { t } = useTranslation()

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

  const form = useForm<ExtraInstallmentFormValues>({
    resolver: zodResolver(extraInstallmentSchema),
    defaultValues: {
      amount: "",
      frequency: "one-time",
      start_date: getInitialDate(),
    },
  })

  // Get the date boundaries
  const fifteenYearsAgo = startOfDay(subYears(new Date(), 15));
  const twentyYearsFromNow = startOfDay(addYears(new Date(), 20));

  // Calculate years range
  const startYear = fifteenYearsAgo.getFullYear();
  const endYear = twentyYearsFromNow.getFullYear();
  const yearsRange = endYear - startYear + 1;

  // Function to determine if a date should be disabled
  const isDateDisabled = (date: Date) => {
    const startOfDate = startOfDay(date);
    return (
      isBefore(startOfDate, fifteenYearsAgo) || 
      isAfter(startOfDate, twentyYearsFromNow) ||
      isSameDay(startOfDate, fifteenYearsAgo) || 
      isSameDay(startOfDate, twentyYearsFromNow)
    );
  };

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    // IMPROVED approach to preserve date without timezone issues
    // Extract date components from the selected date
    const selectedDate = values.start_date;
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    
    // Create a new date with noon time to avoid timezone issues
    const normalizedDate = new Date(year, month, day, 12, 0, 0, 0);
    
    // Log dates for debugging
    console.log('Extra installment form - Original date:', selectedDate);
    console.log('Extra installment form - Date components:', { year, month: month + 1, day });
    console.log('Extra installment form - Normalized date:', normalizedDate);
    
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
                    date={{
                      from: field.value || null,
                      to: field.value || null
                    }}
                    onDateSelect={({ from }) => field.onChange(from)}
                    variant="outline"
                    numberOfMonths={1}
                    yearsRange={yearsRange}
                    fromYear={startYear}
                    disabled={isDateDisabled}
                    className={cn(
                      "w-full justify-start text-left font-normal form-control-focus",
                      !field.value && "text-muted-foreground"
                    )}
                    classNames={{
                      caption: "text-sm font-medium",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: cn(
                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                      ),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: cn(
                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                      ),
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle:
                        "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
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
            <Plus className="h-4 w-4 opacity-50" />
            <span>{t("extra_installments_section.form.add_button")}</span>
          </Button>
        </div>
      </form>
    </Form>
  )
}
