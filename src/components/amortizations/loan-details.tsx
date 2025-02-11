
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="down_payment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Down Payment</FormLabel>
                <FormControl>
                  <CurrencyInput
                    {...field}
                    currency={selectedProperty?.currency || "PEN"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {selectedProperty && (
            <Badge variant="outline" className="text-xs">
              {downPaymentPercentage}%
            </Badge>
          )}
        </div>

        <FormField
          control={form.control}
          name="interest_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interest Rate (%)</FormLabel>
              <FormControl>
                <div className="relative">
                  <input
                    {...field}
                    type="number"
                    step="0.1"
                    min={interestRateLimits.min_rate}
                    max={interestRateLimits.max_rate}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand active:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                      !isInterestRateValid && field.value && "border-destructive"
                    )}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    %
                  </div>
                </div>
              </FormControl>
              {!isInterestRateValid && field.value && (
                <p className="text-sm text-destructive">
                  Interest rate must be between {interestRateLimits.min_rate}% and {interestRateLimits.max_rate}%
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
