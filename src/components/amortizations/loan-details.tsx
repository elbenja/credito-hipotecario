import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { UseFormReturn } from "react-hook-form"
import { AmortizationFormValues } from "./schema"
import { Property } from "./property-select"
import { cn, formatDate } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, PlayCircle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

type BonusRule = {
  min_value: number
  max_value: number
  traditional_bonus: number
  sustainable_bonus: number
}

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
  const { data: exchangeRate } = useExchangeRate()
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])

  // Load bonus rules
  useEffect(() => {
    const loadBonusRules = async () => {
      const { data: rulesData } = await supabase
        .from("bonus_rules")
        .select("*")
        .order('min_value', { ascending: true })
      
      setBonusRules(rulesData || [])
    }
    loadBonusRules()
  }, [])

  // Ensure we have default values and proper type handling
  const downPaymentValue = form.watch("down_payment") || "0"
  const downPayment = typeof downPaymentValue === "string" 
    ? parseFloat(downPaymentValue.replace(/[^0-9.]/g, "") || "0") 
    : 0

  const downPaymentPercentage = selectedProperty?.price_cost 
    ? ((downPayment / selectedProperty.price_cost) * 100).toFixed(1)
    : "0.0"

  // Convert property value to PEN for bonus calculation
  const convertToPEN = (amount: number, currency: string): number => {
    if (currency === 'PEN') return amount
    return amount * (exchangeRate || 3.7167)
  }

  // Calculate First Home Bonus
  const calculateBonus = (property: Property | null): number => {
    if (!property || !property.is_first_home) return 0

    const propertyValueInPEN = convertToPEN(property.price_cost, property.currency)
    
    const applicableRule = bonusRules.find(
      rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    )

    if (!applicableRule) return 0

    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus
  }

  // Calculate loan amount considering bonus and currency conversion
  const calculateLoanAmount = (): number => {
    if (!selectedProperty) return 0

    const bonus = calculateBonus(selectedProperty)
    const bonusInPropertyCurrency = selectedProperty.currency === 'USD' 
      ? bonus / (exchangeRate || 3.7167)
      : bonus

    return selectedProperty.price_cost - bonusInPropertyCurrency - downPayment
  }

  const loanAmount = calculateLoanAmount()

  const interestRateValue = form.watch("interest_rate") || "4"
  const interestRate = typeof interestRateValue === "string"
    ? parseFloat(interestRateValue || "4")
    : 4

  const isInterestRateValid = !isNaN(interestRate) && 
    interestRate >= interestRateLimits.min_rate && 
    interestRate <= interestRateLimits.max_rate

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Loan Amount</div>
        <div className="text-3xl font-bold">
          {selectedProperty?.currency === "USD" ? "$" : "S/"}{" "}
          {Math.round(loanAmount).toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">
          = Property Cost - First Home Bonus - Down Payment
        </div>
      </div>
      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Basics</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Suggest Scenario
            </Button>
            <Button variant="secondary" size="sm" className="px-2">
              <PlayCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Down Payment */}
        <FormField
          control={form.control}
          name="down_payment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Down Payment</FormLabel>
              <div className="flex gap-4 items-center">
                <FormControl>
                  <CurrencyInput
                    {...field}
                    currency={selectedProperty?.currency || "PEN"}
                  />
                </FormControl>
                {selectedProperty && (
                  <Badge variant="outline">
                    {downPaymentPercentage}%
                  </Badge>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Interest Rate and Term */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="interest_rate"
            render={({ field, fieldState: { error } }) => (
              <FormItem>
                <FormLabel className={cn(error && "text-destructive")}>Interest rate</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      className={cn(
                        "pr-8",
                        error && "border-destructive focus-visible:ring-destructive"
                      )}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        form.trigger("interest_rate");
                      }}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
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
            name="term_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amortization Term</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="form-control-focus">
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
                <FormLabel>Instalments per Year</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="form-control-focus">
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
                <FormLabel>First Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal form-control-focus",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          formatDate(field.value)
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
