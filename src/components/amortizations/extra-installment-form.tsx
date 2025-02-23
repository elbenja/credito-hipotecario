import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"

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
    .min(1, "Amount is required")
    .refine((val) => {
      const amount = parseFloat(val.replace(/[^0-9.]/g, ""))
      return !isNaN(amount) && amount > 0
    }, "Amount must be greater than 0"),
  frequency: z.enum(["monthly", "one-time"]),
  start_date: z.date({
    required_error: "Start date is required",
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
  const form = useForm<ExtraInstallmentFormValues>({
    resolver: zodResolver(extraInstallmentSchema),
    defaultValues: {
      amount: "",
      frequency: "one-time",
      start_date: new Date(),
    },
  })

  const handleSubmit = (values: ExtraInstallmentFormValues) => {
    onSubmit(values)
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-[1fr_1fr_1fr_84px] gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="0"
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
                <FormLabel>Frequency</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value: "monthly" | "one-time") => field.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one-time">Once</SelectItem>
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
                <FormLabel>First Date</FormLabel>
                <FormControl>
                  <CalendarDatePicker
                    date={{ from: field.value, to: field.value }}
                    onDateSelect={({ from }) => field.onChange(from)}
                    numberOfMonths={1}
                    closeOnSelect={true}
                    variant="outline"
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
            className="self-end px-3 w-[84px]"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </form>
    </Form>
  )
}
