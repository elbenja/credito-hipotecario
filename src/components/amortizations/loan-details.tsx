
import { Badge } from "@/components/ui/badge"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { UseFormReturn } from "react-hook-form"
import { AmortizationFormValues } from "./schema"
import { Property } from "./property-select"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type LoanDetailsProps = {
  form: UseFormReturn<AmortizationFormValues>
  selectedProperty: Property | null
  interestRateLimits: {
    min_rate: number
    max_rate: number
  }
}

export function LoanDetails({ 
  form, 
  selectedProperty, 
  interestRateLimits 
}: LoanDetailsProps) {
  const downPayment = parseFloat(form.watch("down_payment").replace(/[^0-9.]/g, "")) || 0
  const downPaymentPercentage = selectedProperty
    ? ((downPayment / selectedProperty.price_cost) * 100).toFixed(1)
    : "0.0"
  const loanAmount = selectedProperty
    ? selectedProperty.price_cost - downPayment
    : 0

  const interestRate = parseFloat(form.watch("interest_rate")) || 0
  const isInterestRateValid = !isNaN(interestRate) && 
    interestRate >= interestRateLimits.min_rate && 
    interestRate <= interestRateLimits.max_rate

  return (
    <div className="space-y-6">
      <Separator />
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Loan Amount</div>
        <div className="text-3xl font-bold">
          {selectedProperty?.currency === "USD" ? "$" : "S/"}{" "}
          {loanAmount.toLocaleString()}
        </div>
      </div>
      <Separator />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Basics</h2>
        
        {/* Down Payment */}
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="down_payment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Down Payment</FormLabel>
                <div className="flex gap-4 items-center">
                  <FormControl>
                    <CurrencyInput
                      {...field}
                      currency={selectedProperty?.currency || "PEN"}
                      className="text-lg"
                    />
                  </FormControl>
                  {selectedProperty && (
                    <Badge variant="outline" className="text-base py-1.5">
                      {downPaymentPercentage}%
                    </Badge>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Interest Rate and Term */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="interest_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Interest rate</FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      {...field}
                      type="number"
                      step="0.1"
                      min={interestRateLimits.min_rate}
                      max={interestRateLimits.max_rate}
                      className={cn(
                        "flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        !isInterestRateValid && field.value && "border-destructive"
                      )}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-base">
                      %
                    </div>
                  </div>
                </FormControl>
                {!isInterestRateValid && field.value && (
                  <FormMessage>
                    Interest rate must be between {interestRateLimits.min_rate}% and {interestRateLimits.max_rate}%
                  </FormMessage>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="term_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Amortization Term</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-lg rounded-xl">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[10, 15, 20, 25, 30].map((years) => (
                      <SelectItem key={years} value={years.toString()}>
                        {years} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Installments and First Date */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installments_per_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Instalments per Year</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-lg rounded-xl">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[
                      { value: "12", label: "12 (Monthly)" },
                      { value: "14", label: "14 (Biweekly)" },
                      { value: "24", label: "24 (Twice Monthly)" },
                      { value: "26", label: "26 (Every 2 Weeks)" }
                    ].map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="first_installment_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">First Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-12 text-lg w-full rounded-xl font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
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
                      disabled={(date) =>
                        date < new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )
}
