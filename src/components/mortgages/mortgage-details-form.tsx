import * as z from "zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { addYears, subYears, startOfDay, isBefore, isAfter, isSameDay, format, isValid } from "date-fns"
import {
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
import { cn, normalizeDate, formatCurrency, handleInputFocus } from "@/lib/utils"
import type { Property } from "./property-select"
import type { MortgageFormValues as AmortizationFormValues } from "./schema"
import { LoanCalculator } from "@/services/mortgages/calculations/loan"
import { Separator } from "@/components/ui/separator"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/integrations/supabase/client"
import { CurrencyInput } from "@/components/ui/currency-input"
import { zodResolver } from "@hookform/resolvers/zod"
import { mortgageFormSchema, type MortgageFormValues } from "./schema"

interface AmortizationDetailsFormProps {
  form: ReturnType<typeof useForm<MortgageFormValues>>
  selectedProperty: Property
  onSubmit: (values: MortgageFormValues) => Promise<void>
  submitLabel?: string
  isSubmitting?: boolean
  onLoanAmountChange?: (amount: number) => void
}

export function AmortizationDetailsForm({
  form,
  selectedProperty,
  onSubmit,
  submitLabel = 'save',
  isSubmitting,
  onLoanAmountChange
}: AmortizationDetailsFormProps) {
  const { t } = useTranslation(['mortgages', 'global', 'components'])
  const { data: exchangeRate } = useExchangeRate()
  const [cachedBonus, setCachedBonus] = useState<number | null>(null)
  const loanCalculator = new LoanCalculator()
  
  // Normalize the first_installment_date when component mounts
  // This fixes timezone issues with date handling
  useEffect(() => {
    const currentDate = form.getValues("first_installment_date");
    if (currentDate) {
      form.setValue("first_installment_date", normalizeDate(currentDate));
    }
  }, [form]);

  // Set the exchange rate in the calculator
  useEffect(() => {
    if (exchangeRate) {
      loanCalculator.setExchangeRate(exchangeRate);
    }
  }, [exchangeRate, loanCalculator]);

  // Get property bonus when property changes
  useEffect(() => {
    if (selectedProperty?.id) {
      const getBonus = async () => {
        const bonus = await loanCalculator.getPropertyBonus(supabase, selectedProperty.id);
        setCachedBonus(bonus);
      };
      
      getBonus();
    }
  }, [selectedProperty?.id, loanCalculator]);

  // Helper function to create a property compatible with LoanCalculator
  const createCalculatorProperty = (property: Property) => {
    const calculatorProperty = {
      id: property.id,
      name: property.name,
      price_cost: property.price_cost,
      currency: property.currency,
      property_insurance: property.property_insurance || 0,
      property_insurance_type: property.property_insurance_type || 'auto',
      is_first_home: property.is_first_home || false,
      is_sustainable: property.is_sustainable || false
    };
    
    return calculatorProperty;
  };

  // Watch the down payment field for real-time calculation
  const downPayment = form.watch("down_payment")
  const numericDownPayment = parseFloat(downPayment?.replace(/[^0-9.]/g, "") || "0")

  // Calculate loan amount using LoanCalculator
  const loanAmount = useMemo(() => {
    if (!selectedProperty) return 0;

    // Create a property object compatible with LoanCalculator
    const propertyForCalculator = createCalculatorProperty(selectedProperty);
    
    // Use the synchronous version with cached bonus
    const calculatedAmount = loanCalculator.calculateLoanAmountSync(
      propertyForCalculator, 
      numericDownPayment, 
      cachedBonus || 0
    );
    
    // Call the callback to update loan amount in parent component
    if (onLoanAmountChange) {
      onLoanAmountChange(calculatedAmount);
    }
    
    return calculatedAmount;
  }, [selectedProperty, numericDownPayment, cachedBonus, loanCalculator, onLoanAmountChange]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Loan Amount Display */}
      <div className="space-y-2">
        <h4 className=" font-medium ">{t('amortization.loan_amount', { ns: 'mortgages' })}</h4>
        <div className="text-xl xl:text-2xl 2xl:text-3xl font-bold">
          {formatCurrency(Math.round(loanAmount), selectedProperty?.currency || "PEN")}
          {/* brackets */}
        </div>
        <div className="text-xs ">
          {t('amortization.loan_amount_formula', { ns: 'mortgages' })}
        </div>
        {/* {cachedBonus && cachedBonus > 0 && (
          <div className="text-sm text-muted-foreground">
            {t('amortization.includes_bonus', 'Includes bonus', { ns: 'mortgages' })}: {formatCurrency(cachedBonus, "PEN")}
          </div>
        )} */}
      </div>
      <Separator />

      <div>
        {/* <h4 className="font-medium mb-4">{t('amortization.title', { ns: 'mortgages' })}</h4> */}
        <div className="space-y-6 sm:space-y-4">
        <div className="mt-4">           
          <h4 className="font-medium"> {t('amortization.down_payment', { ns: 'mortgages' })}   </h4>
          <div className="grid grid-col-1 sm:grid-cols-[_1fr_16px_1fr] ">
         
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amortization.property_percentage', 'Property %', { ns: 'mortgages' })}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="90"
                        placeholder="0.00"
                        className="pr-8"
                        value={form.watch("down_payment") ? 
                          Number(((parseFloat(form.watch("down_payment")) / selectedProperty.price_cost) * 100).toFixed(2)) : 
                          ""}
                        onFocus={handleInputFocus}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty input
                          if (value === "") {
                            return
                          }
                          
                          // Parse the percentage input and calculate down payment
                          const percentage = parseFloat(value)
                          if (!isNaN(percentage)) {
                            const downPayment = (percentage / 100 * selectedProperty.price_cost).toFixed(2)
                            form.setValue("down_payment", downPayment, { shouldValidate: true })
                          }
                        }}
                        onBlur={(e) => {
                          // Format to 2 decimal places when leaving the field
                          const value = e.target.value
                          if (value && value !== "") {
                            const percentage = parseFloat(value)
                            if (!isNaN(percentage)) {
                              e.target.value = percentage.toFixed(2)
                              const downPayment = (percentage / 100 * selectedProperty.price_cost).toFixed(2)
                              form.setValue("down_payment", downPayment, { shouldValidate: true })
                            }
                          } else {
                            // If field is empty on blur, set to "0"
                            form.setValue("down_payment", "0", { shouldValidate: true })
                          }
                        }}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                        %
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {form.watch("down_payment") && 
                   (Number(((parseFloat(form.watch("down_payment").replace(/[^0-9.]/g, "") || "0") / selectedProperty.price_cost) * 100).toFixed(2)) > 90) && (
                    <p className="text-sm font-medium text-destructive">
                      {t('amortization.validation.down_payment_max', 'Max is 90% of property cost', { ns: 'mortgages' })}
                    </p>
                  )}
                </FormItem>
              )}
            />
            <div className="h-5 sm:h-16 inline-flex justify-center items-end ">    =  </div>
               <FormField
              control={form.control}
              name="down_payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('amortization.amount_in', { ns: 'mortgages' })}
                    {selectedProperty?.currency === 'USD' ? ' $' : ' S/'}
                  </FormLabel>
                  <FormControl>
                    <CurrencyInput 
                      value={field.value || ''}
                      onChange={(value) => {
                        field.onChange(value)
                        form.trigger("down_payment")
                      }}
                      currency={selectedProperty?.currency || 'PEN'}
                    />
                  </FormControl>
                  <FormMessage />
                 
                </FormItem>
              )}
            />
             
          </div>
        </div>  
<div className="mt-8">   
        <h4 className="font-medium"> {t('insurance.loan_protection', { ns: 'mortgages' })}  </h4>
          <div className="grid grid-col-1 sm:grid-cols-[_1fr_16px_1fr] "> 
            <FormField
              control={form.control}
              name="loan_protection_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amortization.insurance.type', { ns: 'mortgages' })}</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value)
                    form.trigger("loan_protection_type")
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="individual">{t('insurance.individual')}</SelectItem>
                      <SelectItem value="joint">{t('insurance.joint')}</SelectItem>
                      <SelectItem value="none">{t('insurance.none')}</SelectItem>
                      <SelectItem value="custom">{t('amortization.insurance.manual', 'Manual', { ns: 'mortgages' })}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="h-5 sm:h-16 inline-flex justify-center items-end ">    =  </div>
            <FormField
              control={form.control}
              name="loan_protection_insurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amortization.monthly_rate', { ns: 'mortgages' })}  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="number"
                        step="0.0001"
                        min="0"
                        max="1"
                        disabled={form.watch("loan_protection_type") !== "custom"}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value
                          const numValue = parseFloat(value)
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
                            field.onChange(value)
                            form.trigger("loan_protection_insurance")
                          }
                        }}
                        placeholder="Enter rate (0-1)"
                        className="pr-8"
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
          </div>
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amortization.interest_rate', { ns: 'mortgages' })}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} 
                        type="number" 
                        step="0.01" 
                        className="pr-8"
                        onChange={(e) => {
                          field.onChange(e)
                          form.trigger("interest_rate")
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
                  <FormLabel>{t('amortization.term', { ns: 'mortgages' })}</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value)
                    form.trigger("term_years")
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[10, 15, 20, 25, 30].map((years) => (
                        <SelectItem key={years} value={years.toString()}>
                          {years} {t('scenarios.new_rate.form.years', { ns: 'mortgages', value: years })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="installments_per_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amortization.installments_per_year', { ns: 'mortgages' })}</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      
                      // Force immediate validation and form update
                      form.trigger("installments_per_year");
                      
                      // Apply a more comprehensive update with timeout to ensure state propagation
                      setTimeout(() => {
                        // Force a complete form update with all events triggered
                        form.setValue("installments_per_year", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true
                        });
                        
                        // Trigger a manual submit event to propagate the change
                        if (onSubmit && typeof onSubmit === 'function') {
                          form.handleSubmit(onSubmit)();
                        }
                      }, 0);
                    }} 
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select installments" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="12">{t('amortization.installment_type.regular', 'Regular', { ns: 'mortgages' })}</SelectItem>
                      <SelectItem value="14">{t('amortization.installment_type.double', 'Double', { ns: 'mortgages' })}</SelectItem>
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
                  <FormLabel>{t('amortization.first_date', { ns: 'mortgages' })}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={field.value ? (() => {
                          const monthValue = format(field.value, "MMM");
                          return monthValue;
                        })() : format(new Date(), "MMM")}
                        onValueChange={(month) => {
                          try {
                            const currentDate = field.value || new Date();
                            if (!isValid(currentDate)) {
                              const today = new Date();
                              field.onChange(normalizeDate(today));
                              return;
                            }
                            
                            const targetMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month);
                            const currentYear = currentDate.getFullYear();
                            
                            // Always use day 1
                            const newDate = new Date(currentYear, targetMonth, 1, 12, 0, 0, 0);
                            
                            // Ensure the date is valid
                            if (!isValid(newDate)) {
                              return;
                            }
                            
                            field.onChange(normalizeDate(newDate));
                            form.trigger("first_installment_date");
                          } catch (error) {
                            // Handle error silently
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={field.value ? format(field.value, "yyyy") : format(new Date(), "yyyy")}
                        onValueChange={(year) => {
                          try {
                            const currentDate = field.value || new Date();
                            if (!isValid(currentDate)) {
                              const today = new Date();
                              field.onChange(normalizeDate(today));
                              return;
                            }
                            
                            const currentMonth = currentDate.getMonth();
                            
                            // Always use day 1
                            const newDate = new Date(parseInt(year), currentMonth, 1, 12, 0, 0, 0);
                            
                            // Ensure the date is valid
                            if (!isValid(newDate)) {
                              return;
                            }
                            
                            field.onChange(normalizeDate(newDate));
                            form.trigger("first_installment_date");
                          } catch (error) {
                            // Handle error silently
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const currentYear = new Date().getFullYear();
                            const startYear = currentYear - 15; // 15 years back
                            const endYear = currentYear + 20;   // 20 years forward
                            const yearsRange = endYear - startYear + 1;
                            return Array.from({ length: yearsRange }, (_, i) => startYear + i);
                          })().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
      <div className=" sm:mb-16 sm:h-80" >

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <div className="flex items-center">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
            {submitLabel === 'save' ? t('ui.saving', 'Saving...', { ns: 'global' }) : t('ui.creating', 'Creating...', { ns: 'global' })}
          </div>
        ) : (
          submitLabel === 'save' ? t('ui.save', { ns: 'global' }) : submitLabel
        )}
      </Button>
      </div>
    </form>
  )
} 