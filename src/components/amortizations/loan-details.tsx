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
import { cn, formatDate, formatCurrency, formatInsurance, formatInterest } from "@/lib/utils"
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
import { useTranslation } from "react-i18next"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"

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
  const { t } = useTranslation()
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

  // Combine form watches into a single subscription
  const {
    down_payment: downPaymentValue = "0",
    interest_rate: interestRateValue = "4",
    loan_protection_type: insuranceType,
    loan_protection_insurance: insuranceRate
  } = form.watch(["down_payment", "interest_rate", "loan_protection_type", "loan_protection_insurance"]);

  // Memoize derived values
  const downPayment = React.useMemo(() => {
    return typeof downPaymentValue === "string"
      ? parseFloat(downPaymentValue.replace(/[^0-9.]/g, "") || "0")
      : 0;
  }, [downPaymentValue]);

  const isCustom = insuranceType === "custom";
  const isNone = insuranceType === "none";

  // Memoize insurance rate calculation
  const calculatedInsuranceRate = React.useMemo(() => {
    if (isCustom || isNone) return "0";
    
    if (insuranceType === "individual" || insuranceType === "joint") {
      const defaultRates = {
        individual: "0.028",
        joint: "0.052"
      };
      
      return Array.isArray(insuranceRates)
        ? insuranceRates.find((r: any) => r.type === insuranceType)?.percentage?.toString() ?? 
          defaultRates[insuranceType]
        : defaultRates[insuranceType];
    }
    
    return "0";
  }, [insuranceType, insuranceRates, isCustom, isNone]);

  // Combine insurance rate update with form watch
  React.useEffect(() => {
    const newRate = isCustom ? insuranceRate : calculatedInsuranceRate;
    if (form.getValues("loan_protection_insurance") !== newRate) {
      form.setValue("loan_protection_insurance", newRate, { 
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [calculatedInsuranceRate, isCustom, insuranceRate]);

  // Memoize insurance amount calculation
  const calculateInsuranceAmount = React.useCallback((type: string, amount: number) => {
    if (!amount || type === 'none') return 0;
    
    const rate = isCustom 
      ? parseFloat(insuranceRate || "0") / 100
      : parseFloat(calculatedInsuranceRate) / 100;

    return amount * rate;
  }, [calculatedInsuranceRate, isCustom, insuranceRate]);

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

    toast.message(t("suggested_scenario_applied"), {
      description: t("suggested_scenario_description")
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">{t("loan_amount")}</div>
        <div className="text-3xl font-bold">
          {formatCurrency(Math.round(loanAmount), selectedProperty?.currency || "PEN")}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("loan_amount_formula")}
        </div>
      </div>
      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("basics")}</h2>
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
                  <span>{t("suggested")}</span>
                </div>
              ) : (
                t("suggest_scenario")
              )}
            </Toggle>
            <Button variant="secondary" className="px-3">
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
                <FormLabel>{t("down_payment")}</FormLabel>
                <FormControl>
                  <CurrencyInput
                    {...field}
                    currency={selectedProperty?.currency || "PEN"}
                    className={cn(
                      "w-full",
                      highlightFields.downPayment && "animate-highlight"
                    )}
                    onChange={(value) => {
                      field.onChange(value);
                      const numericValue = parseFloat(value.replace(/[^0-9.]/g, "") || "0");
                      setDownPaymentPercent(
                        selectedProperty
                          ? (numericValue / selectedProperty.price_cost) * 100
                          : 0
                      );
                    }}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-normal",
                      highlightFields.propertyPercent && "animate-highlight"
                    )}
                  >
                    {formatInsurance(downPaymentPercent, true)}
                  </Badge>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>{t("property_percentage")}</FormLabel>
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
                <FormLabel>{t("loan_protection_insurance")}</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === 'none') {
                      form.setValue('loan_protection_insurance', '0');
                    }
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="form-control-focus">
                      <SelectValue placeholder={t("select_insurance_type")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="individual">
                      {t("individual_insurance", { 
                        rate: Array.isArray(insuranceRates) 
                          ? insuranceRates.find((r: any) => r.type === "individual")?.percentage ?? 0.028 
                          : 0.028 
                      })}
                    </SelectItem>
                    <SelectItem value="joint">
                      {t("joint_insurance", { 
                        rate: Array.isArray(insuranceRates) 
                          ? insuranceRates.find((r: any) => r.type === "joint")?.percentage ?? 0.052 
                          : 0.052 
                      })}
                    </SelectItem>
                    <SelectItem value="none">{t("none")}</SelectItem>
                    <SelectItem value="custom">{t("custom_amount")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loan_protection_insurance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("monthly_insurance_rate")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type="number"
                      step="0.0001"
                      min="0"
                      max="100"
                      disabled={!isCustom}
                      value={isCustom ? field.value : calculatedInsuranceRate}
                      onChange={(e) => {
                        if (isCustom) {
                          const value = e.target.value;
                          field.onChange(formatInsurance(value, true).replace('%', ''));
                        }
                      }}
                      className={cn(
                        "pr-8",
                        !isCustom && "text-muted-foreground"
                      )}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                      %
                    </div>
                  </div>
                </FormControl>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatInsurance(
                    calculateInsuranceAmount(insuranceType, loanAmount),
                    true
                  )}
                  {t(" of beginning balance")}
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
                <FormLabel>{t("interest_rate_ear")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min={interestRateLimits.min_rate}
                      max={interestRateLimits.max_rate}
                      className={cn(
                        "pr-8",
                        !isInterestRateValid && "border-destructive"
                      )}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Format to 2 decimal places
                        const formattedValue = parseFloat(value).toFixed(2);
                        field.onChange(formattedValue);
                      }}
                      value={field.value}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                      %
                    </div>
                  </div>
                </FormControl>
                {!isInterestRateValid && (
                  <p className="text-xs text-destructive mt-1">
                    {t("interest_rate_limits", {
                      min: `${interestRateLimits.min_rate.toFixed(2)}%`,
                      max: `${interestRateLimits.max_rate.toFixed(2)}%`
                    })}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="term_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("amortization_term")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger 
                      className={cn(
                        "form-control-focus",
                        highlightFields.termYears && "ring-2 ring-primary transition-all duration-500"
                      )}
                    >
                      <SelectValue placeholder={t("select_term")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[10, 15, 20, 25, 30].map((years) => (
                      <SelectItem key={years} value={years.toString()}>
                        {t("years_term", { years })}
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
                <FormLabel>{t("installments_per_year")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger 
                      className={cn(
                        "form-control-focus",
                        highlightFields.installments && "ring-2 ring-primary transition-all duration-500"
                      )}
                    >
                      <SelectValue placeholder={t("select_frequency")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[
                      { value: "12", label: t("simple_installments") },
                      { value: "14", label: t("double_installments") }
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
                <FormLabel>{t("first_date")}</FormLabel>
                <FormControl>
                  <CalendarDatePicker
                    date={{
                      from: field.value,
                      to: field.value
                    }}
                    onDateSelect={({ from }) => field.onChange(from)}
                    variant="outline"
                    numberOfMonths={1}
                    closeOnSelect={true}
                    disabled={(date) => date < new Date()}
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
        </div>
      </div>

      <div className="text-sm text-muted-foreground mt-2">
        {t("monthly_insurance_cost")}: {formatCurrency(
          calculateInsuranceAmount(
            insuranceType,
            loanAmount
          ),
          selectedProperty?.currency || "PEN",
          true
        )}
      </div>
    </div>
  )
}
