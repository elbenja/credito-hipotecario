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
import { cn, formatDate, formatCurrency } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, PlayCircle, Check } from "lucide-react"
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
import { Toggle } from "@/components/ui/toggle"
import { toast } from "sonner"
import { useInsuranceRates, type InsuranceRate } from "@/hooks/use-insurance-rates"
import React from "react"

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
  const { data: insuranceRates } = useInsuranceRates()
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [isSuggested, setIsSuggested] = useState(false)
  const [downPaymentPercent, setDownPaymentPercent] = useState(0)
  const [highlightFields, setHighlightFields] = useState({
    downPayment: false,
    propertyPercent: false,
    termYears: false,
    installments: false
  })

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

  // Watch the relevant fields for changes
  const watchedFields = form.watch([
    "down_payment",
    "term_years",
    "installments_per_year"
  ])

  // Calculate suggested values based on property cost
  const suggestScenario = () => {
    if (!selectedProperty) return
    
    form.setValue("down_payment", (selectedProperty.price_cost * 0.10).toString())
    form.setValue("term_years", "20")
    form.setValue("installments_per_year", "12")
    setDownPaymentPercent(10)
    setIsSuggested(true)

    // Set highlight effect
    setHighlightFields({
      downPayment: true,
      propertyPercent: true,
      termYears: true,
      installments: true
    })

    // Clear highlight effect after delay
    setTimeout(() => {
      setHighlightFields({
        downPayment: false,
        propertyPercent: false,
        termYears: false,
        installments: false
      })
    }, 500) // 500ms total (200ms highlight + 300ms fade)

    toast.message("Suggested Scenario Applied", {
      description: "Amortization Term set to 20 years, Down Payment set to 10%, and Installments is 1 per month"
    })
  }

  // Reset suggested state if user changes any watched field
  useEffect(() => {
    if (isSuggested) {
      const suggestedValues = {
        down_payment: selectedProperty ? (selectedProperty.price_cost * 0.10).toString() : "0",
        term_years: "20",
        installments_per_year: "12"
      }

      const currentValues = {
        down_payment: form.getValues("down_payment"),
        term_years: form.getValues("term_years"),
        installments_per_year: form.getValues("installments_per_year")
      }

      if (JSON.stringify(suggestedValues) !== JSON.stringify(currentValues)) {
        setIsSuggested(false)
      }
    }
  }, [watchedFields, selectedProperty, isSuggested, form])

  useEffect(() => {
    if (selectedProperty) {
      const downPayment = parseFloat(form.getValues("down_payment").replace(/[^0-9.]/g, ""))
      const percent = (downPayment / selectedProperty.price_cost) * 100
      setDownPaymentPercent(percent)
    }
  }, [selectedProperty, form])

  // Calculate insurance amount based on type and loan amount
  const calculateInsuranceAmount = (type: string, amount: number) => {
    if (!insuranceRates || !amount) return 0
    
    const rate = insuranceRates.find((r): r is InsuranceRate => 'type' in r && r.type === type)
    if (!rate) {
      console.warn(`No rate found for type ${type}, using default`)
      // Use default rates if not found in table (convert percentage to decimal)
      const defaultRates = {
        individual: 0.028 / 100, // 0.028% -> 0.00028
        joint: 0.052 / 100      // 0.052% -> 0.00052
      }
      return amount * defaultRates[type as keyof typeof defaultRates]
    }
    
    // Use rate from table - convert percentage to decimal
    return amount * (rate.percentage / 100)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Loan Amount</div>
        <div className="text-3xl font-bold">
          {formatCurrency(Math.round(loanAmount), selectedProperty?.currency || "PEN")}
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
            <Toggle
              pressed={isSuggested}
              onPressedChange={() => {
                if (!isSuggested) {
                  suggestScenario()
                }
              }}
              className="w-full border border-input hover:bg-accent hover:text-accent-foreground"
              variant="outline"
            >
              {isSuggested ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Suggested</span>
                </div>
              ) : (
                "Suggest Scenario"
              )}
            </Toggle>
            <Button variant="secondary" size="sm" className="px-2">
              <PlayCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Down Payment */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="down_payment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Down Payment</FormLabel>
                <FormControl>
                  <CurrencyInput
                    placeholder="Enter down payment"
                    currency={selectedProperty?.currency || "PEN"}
                    {...field}
                    className={cn(
                      highlightFields.downPayment && "ring-2 ring-primary transition-all duration-500"
                    )}
                    onChange={(value) => {
                      field.onChange(value)
                      if (selectedProperty) {
                        const downPayment = parseFloat(value.replace(/[^0-9.]/g, "") || "0")
                        const percent = (downPayment / selectedProperty.price_cost) * 100
                        setDownPaymentPercent(percent)
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Property %</FormLabel>
            <div className="relative">
              <Input 
                type="number"
                value={downPaymentPercent.toFixed(0)}
                onChange={(e) => {
                  const newPercent = parseFloat(e.target.value)
                  setDownPaymentPercent(newPercent)
                  if (selectedProperty && !isNaN(newPercent)) {
                    const newDownPayment = (selectedProperty.price_cost * newPercent / 100).toString()
                    form.setValue("down_payment", newDownPayment)
                  }
                }}
                min="0"
                max="100"
                step="1"
                className={cn(
                  "pr-8",
                  highlightFields.propertyPercent && "ring-2 ring-primary transition-all duration-500"
                )}
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                %
              </div>
            </div>
          </FormItem>
        </div>
        
        {/* Loan Protection Insurance */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="loan_protection_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Protection Insurance</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // If type is none, ensure insurance amount is 0
                    if (value === 'none') {
                      form.setValue('loan_protection_insurance', '0');
                    }
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="form-control-focus">
                      <SelectValue placeholder="Select insurance type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="individual">
                      Individual ({Array.isArray(insuranceRates) ? insuranceRates.find((r: any) => r.type === "individual")?.percentage ?? 0.028 : 0.028}%)
                    </SelectItem>
                    <SelectItem value="joint">
                      Joint ({Array.isArray(insuranceRates) ? insuranceRates.find((r: any) => r.type === "joint")?.percentage ?? 0.052 : 0.052}%)
                    </SelectItem>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="custom">Custom Amount</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loan_protection_insurance"
            render={({ field }) => {
              const insuranceType = form.watch("loan_protection_type")
              const isCustom = insuranceType === "custom"
              const isNone = insuranceType === "none"
              
              let calculatedValue = "0"
              if (insuranceType === "individual" || insuranceType === "joint") {
                calculatedValue = calculateInsuranceAmount(insuranceType, loanAmount).toFixed(2)
              }

              // Update the insurance amount when type or loan amount changes
              React.useEffect(() => {
                if (!isCustom && !isNone) {
                  form.setValue("loan_protection_insurance", calculatedValue)
                } else if (isNone) {
                  form.setValue("loan_protection_insurance", "0")
                }
              }, [insuranceType, loanAmount, calculatedValue, isCustom, isNone])

              return (
                <FormItem>
                  <FormLabel>Monthly Insurance Cost</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      {...field}
                      disabled={!isCustom}
                      value={isCustom ? field.value : calculatedValue}
                      currency={selectedProperty?.currency || "PEN"}
                      onChange={(value) => {
                        if (isCustom) {
                          field.onChange(value)
                        }
                      }}
                      className={cn(!isCustom && "text-muted-foreground")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>

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
                    <SelectTrigger 
                      className={cn(
                        "form-control-focus",
                        highlightFields.termYears && "ring-2 ring-primary transition-all duration-500"
                      )}
                    >
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
                    <SelectTrigger 
                      className={cn(
                        "form-control-focus",
                        highlightFields.installments && "ring-2 ring-primary transition-all duration-500"
                      )}
                    >
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[
                      { value: "12", label: "Simple" },
                      { value: "14", label: "Double" },
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
