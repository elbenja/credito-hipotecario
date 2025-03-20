import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { PropertySelect, Property, PropertyDisplay } from "@/components/amortizations/property-select"
import { SEO } from "@/components/seo"
import { amortizationFormSchema, type AmortizationFormValues, defaultValues } from "@/components/amortizations/schema"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatCurrency, formatDate, normalizeDate, createLocalDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ExtraInstallmentsSection } from "@/components/amortizations/extra-installments-section"
import { ScenarioTable } from "@/components/amortizations/scenario-table"
import { LoanCalculator } from "@/services/amortization/calculations/loan"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import type { Database } from "@/types/supabase"

type Amortization = Database['public']['Tables']['amortizations']['Row']
type ExtraInstallment = Database['public']['Tables']['extra_installments']['Row']
type RateChange = Database['public']['Tables']['rate_changes']['Row']

interface PaymentRow {
  payment_date: string | Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
  beginning_balance?: number
  ending_balance?: number
}

interface ScenarioSummary {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

interface Scenario {
  summary: ScenarioSummary
  payments: PaymentRow[]
}

interface Scenarios {
  regular?: Scenario
  accelerated?: Scenario
  lower_payment?: Scenario
  new_rate?: Scenario
}

export default function TestExtraInstallments() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [selectedAmortization, setSelectedAmortization] = useState<Amortization | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const propertyForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      ...defaultValues,
      name: "Test Amortization"
    },
  })

  const amortizationForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
  })

  const { data: linkedAmortizations = [], isLoading: isLoadingAmortizations } = useQuery({
    queryKey: ["linked-amortizations", selectedProperty?.id],
    queryFn: async () => {
      if (!user || !selectedProperty) return []

      const { data, error } = await supabase
        .from("amortizations")
        .select("*")
        .eq("property_id", selectedProperty.id)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error fetching amortizations:", error)
        return []
      }

      return data as Amortization[]
    },
    enabled: !!user && !!selectedProperty?.id,
  })

  const handlePropertyChange = (property: Property | null) => {
    setSelectedProperty(property)
    setSelectedAmortization(null)
    if (property) {
      setIsEditing(false)
    }
  }

  const handleAmortizationSelect = (amortization: Amortization) => {
    setSelectedAmortization(amortization)
    amortizationForm.reset({
      name: amortization.name || "",
      property_id: amortization.property_id,
      down_payment: amortization.down_payment.toString(),
      interest_rate: amortization.interest_rate.toString(),
      term_years: amortization.term_years.toString(),
      installments_per_year: amortization.installments_per_year.toString(),
      first_installment_date: createLocalDate(amortization.first_installment_date),
      loan_protection_type: amortization.loan_protection_type as "none" | "custom" | "individual" | "joint",
      loan_protection_insurance: amortization.loan_protection_insurance?.toString(),
    })
  }

  const onUpdateAmortization = async (values: AmortizationFormValues) => {
    try {
      if (!selectedAmortization || !selectedProperty) {
        throw new Error("No amortization or property selected")
      }

      // Parse numeric values safely
      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
      const interestRate = parseFloat(values.interest_rate)
      const termYears = parseInt(values.term_years)
      const installmentsPerYear = parseInt(values.installments_per_year)
      const loanProtectionInsurance = values.loan_protection_insurance 
        ? parseFloat(values.loan_protection_insurance)
        : null

      // Validate numeric values
      if (isNaN(downPayment) || downPayment < 0) {
        throw new Error("Invalid down payment amount")
      }
      if (isNaN(interestRate) || interestRate < 0) {
        throw new Error("Invalid interest rate")
      }
      if (isNaN(termYears) || termYears < 1) {
        throw new Error("Invalid term years")
      }
      // Validate term years against allowed values
      const allowedTermYears = [5, 10, 15, 20, 25, 30]
      if (!allowedTermYears.includes(termYears)) {
        throw new Error("Term years must be one of: 5, 10, 15, 20, 25, or 30 years")
      }
      if (![12, 14].includes(installmentsPerYear)) {
        throw new Error("Invalid installments per year")
      }
      if (loanProtectionInsurance !== null && (isNaN(loanProtectionInsurance) || loanProtectionInsurance < 0)) {
        throw new Error("Invalid loan protection insurance amount")
      }

      // Calculate loan amount
      const loanAmount = selectedProperty.price_cost - downPayment

      // Validate loan amount
      if (loanAmount <= 0) {
        throw new Error("Down payment cannot be greater than property cost")
      }

      // CRITICAL FIX: Ensure we preserve the exact date by using YYYY-MM-DD format
      // First create a Date from the input for component extraction
      const inputDate = new Date(values.first_installment_date);
      // Extract date components
      const year = inputDate.getFullYear();
      const month = inputDate.getMonth(); // 0-based
      const day = inputDate.getDate();
      
      // Create a proper ISO date string preserving the exact date in YYYY-MM-DD format
      // This avoids all timezone issues by omitting the time portion
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      console.log('Updating amortization with date string:', dateString);
      console.log('Original date components:', {
        year: year,
        month: month + 1, // Display 1-based for logging
        day: day
      });
      
      // Prepare amortization data
      const amortizationData = {
        name: values.name,
        down_payment: downPayment,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        first_installment_date: dateString, // Use YYYY-MM-DD string format instead of ISO string with time
        loan_amount: loanAmount,
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: loanProtectionInsurance,
        total_interest: 0, // Will be calculated by the service
        total_payment: 0, // Will be calculated by the service
        installment_amount: 0 // Will be calculated by the service
      }

      // Update amortization in Supabase
      const { error: updateError } = await supabase
        .from("amortizations")
        .update(amortizationData)
        .eq('id', selectedAmortization.id)

      if (updateError) {
        console.error("Supabase update error:", updateError)
        throw new Error(updateError.message)
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["linked-amortizations", selectedProperty.id]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", selectedAmortization.id]
      })

      toast({
        title: "Success",
        description: "Amortization updated successfully",
      })
    } catch (error) {
      console.error("Error updating amortization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "There was an error updating the amortization"
      })
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto py-8 px-8">
      <SEO 
        title="Test Extra Installments - CreditoHipotecar.io"
        description="Testing page for property selection and extra installments functionality"
      />
      
      <h1 className="text-2xl font-bold mb-6">Property Selection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Form {...propertyForm}>
            <form className="space-y-6">
              {isEditing ? (
                <PropertySelect 
                  form={propertyForm} 
                  onPropertyChange={handlePropertyChange}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Property
                    </span>
                  </div>
                  {selectedProperty && <PropertyDisplay property={selectedProperty} />}
                </div>
              )}
            </form>
          </Form>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Selected Property Details</h2>
          <div className="p-6 border rounded-lg">
            {selectedProperty ? (
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {selectedProperty.name}</p>
                <p><span className="font-medium">Price:</span> {selectedProperty.price_cost} {selectedProperty.currency}</p>
                <p><span className="font-medium">First Home:</span> {selectedProperty.is_first_home ? "Yes" : "No"}</p>
                <p><span className="font-medium">Sustainable:</span> {selectedProperty.is_sustainable ? "Yes" : "No"}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No property selected</p>
            )}
          </div>
        </div>
      </div>

      {selectedProperty && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Amortizations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Linked Amortizations</h3>
              <div className="space-y-4">
                {isLoadingAmortizations ? (
                  <p className="text-muted-foreground">Loading amortizations...</p>
                ) : linkedAmortizations.length > 0 ? (
                  linkedAmortizations.map((amortization) => (
                    <div
                      key={amortization.id}
                      className={`p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors ${
                        selectedAmortization?.id === amortization.id ? 'border-primary' : ''
                      }`}
                      onClick={() => handleAmortizationSelect(amortization)}
                    >
                      <h4 className="font-medium">{amortization.name || "Unnamed"}</h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>Loan Amount: {formatCurrency(amortization.loan_amount || 0, selectedProperty.currency)}</p>
                        <p>Interest Rate: {amortization.interest_rate}%</p>
                        <p>First Payment: {formatDate(createLocalDate(amortization.first_installment_date))}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No amortizations found for this property.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Amortization Details</h3>
              <div className="p-6 border rounded-lg">
                {selectedAmortization ? (
                  <Form {...amortizationForm}>
                    <form onSubmit={amortizationForm.handleSubmit(onUpdateAmortization)} className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-4">Basics</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="down_payment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Down Payment</FormLabel>
                                  <FormControl>
                                    <Input {...field} onChange={(e) => {
                                      field.onChange(e);
                                      // Trigger form validation to ensure field values are up-to-date
                                      amortizationForm.trigger("down_payment");
                                    }} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="property_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Property %</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      value={((parseFloat(amortizationForm.watch("down_payment") || "0") / selectedProperty.price_cost) * 100).toFixed(2)}
                                      onChange={(e) => {
                                        const percentage = parseFloat(e.target.value)
                                        const downPayment = (percentage / 100 * selectedProperty.price_cost).toString()
                                        amortizationForm.setValue("down_payment", downPayment)
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="loan_protection_type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Loan Protection Insurance</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    // Trigger form validation to ensure field values are up-to-date
                                    amortizationForm.trigger("loan_protection_type");
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="individual">Individual</SelectItem>
                                      <SelectItem value="joint">Joint</SelectItem>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="custom">Custom Amount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="loan_protection_insurance"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Monthly Insurance Cost</FormLabel>
                                  <FormControl>
                                    <Input {...field} onChange={(e) => {
                                      field.onChange(e);
                                      // Trigger form validation to ensure field values are up-to-date
                                      amortizationForm.trigger("loan_protection_insurance");
                                    }} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="interest_rate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Interest rate</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="0.01" onChange={(e) => {
                                      field.onChange(e);
                                      // Trigger form validation to ensure field values are up-to-date
                                      amortizationForm.trigger("interest_rate");
                                    }} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="term_years"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amortization Term</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    // Trigger form validation to ensure field values are up-to-date
                                    amortizationForm.trigger("term_years");
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[5, 10, 15, 20, 25, 30].map((years) => (
                                        <SelectItem key={years} value={years.toString()}>
                                          {years} years
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="installments_per_year"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Installments per Year</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    // Trigger form validation to ensure field values are up-to-date
                                    amortizationForm.trigger("installments_per_year");
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select installments" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="12">Regular (12)</SelectItem>
                                      <SelectItem value="14">Double (14) - 2x in July & December</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {field.value === "14" && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Double payments in July and December. Monthly payment and insurances are doubled for these months.
                                    </p>
                                  )}
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="first_installment_date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Date</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-full pl-3 text-left font-normal",
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
                                        onSelect={(date) => {
                                          // Set the time to noon to avoid timezone issues
                                          if (date) {
                                            field.onChange(normalizeDate(date));
                                          } else {
                                            field.onChange(date);
                                          }
                                          // Trigger form validation to ensure field values are up-to-date
                                          amortizationForm.trigger("first_installment_date");
                                        }}
                                        disabled={(date) => {
                                          // Allow dates up to 15 years in the past
                                          const fifteenYearsAgo = new Date();
                                          fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);
                                          fifteenYearsAgo.setHours(0, 0, 0, 0); // Start of day
                                          
                                          // Disable if date is more than 15 years in the past or before 1900
                                          return (
                                            date < fifteenYearsAgo || 
                                            date < new Date("1900-01-01")
                                          );
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <Button type="submit" className="w-full">Update</Button>
                    </form>
                  </Form>
                ) : (
                  <p className="text-muted-foreground">Select an amortization to view details</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAmortization && selectedProperty && (
        <>
          <div className="mt-8">
            <ExtraInstallmentsSection
              amortizationId={selectedAmortization.id}
              currency={selectedProperty.currency}
              loanAmount={selectedAmortization.loan_amount}
              onInstallmentsChange={() => {
                queryClient.invalidateQueries({
                  queryKey: ["linked-amortizations", selectedProperty.id]
                })
                queryClient.invalidateQueries({
                  queryKey: ["scenarios", selectedAmortization.id]
                })
              }}
            />
          </div>

          <ScenarioCalculationsSection 
            amortization={selectedAmortization}
            property={selectedProperty}
            form={amortizationForm}
          />
        </>
      )}
    </div>
  )
}

function ScenarioCalculationsSection({ 
  amortization,
  property,
  form
}: { 
  amortization: Amortization
  property: Property
  form: ReturnType<typeof useForm<AmortizationFormValues>>
}) {
  // Debug information for first installment date
  const firstInstallmentDebug = useMemo(() => {
    if (!amortization?.first_installment_date) return null;
    
    // Direct parsing of YYYY-MM-DD format to correctly preserve the day/month
    // This is the critical fix: we need to parse the date string directly rather than through the Date constructor
    let year, month, day;
    
    // If it's in YYYY-MM-DD format, extract components directly from the string
    const dateMatch = amortization.first_installment_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      year = parseInt(dateMatch[1]);
      month = parseInt(dateMatch[2]); // 1-indexed for display
      day = parseInt(dateMatch[3]);
      
      // Create date at noon to avoid any timezone issues
      const normalizedDate = new Date(year, month-1, day, 12, 0, 0, 0);
      
      return {
        originalValue: amortization.first_installment_date,
        parsedDate: normalizedDate.toISOString(),
        components: {
          year: year,
          month: month, // Already 1-indexed from string extraction
          day: day
        }
      };
    } else {
      // Fallback path for non-YYYY-MM-DD format (should not normally occur)
      const rawDate = new Date(amortization.first_installment_date);
      year = rawDate.getFullYear();
      month = rawDate.getMonth() + 1; // Convert 0-indexed month to 1-indexed
      day = rawDate.getDate();
      
      // Create a fresh date object at noon local time to avoid timezone shifts
      const normalizedDate = new Date(year, month-1, day, 12, 0, 0, 0);
      
      return {
        originalValue: amortization.first_installment_date,
        parsedDate: normalizedDate.toISOString(),
        components: {
          year,
          month,
          day
        }
      };
    }
  }, [amortization?.first_installment_date]);

  // Create a local state to track form values for live calculations
  const [formValues, setFormValues] = useState(() => {
    // Parse the first installment date properly to avoid timezone shifts
    let firstInstallmentDate;
    
    if (amortization.first_installment_date) {
      // Check if the date is in YYYY-MM-DD format
      const dateMatch = amortization.first_installment_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        // Create a date from parts to avoid timezone issues
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // Convert to 0-indexed month for Date constructor
        const day = parseInt(dateMatch[3]);
        firstInstallmentDate = new Date(year, month, day, 12, 0, 0, 0);
      } else {
        // Fallback to regular date parsing
        firstInstallmentDate = new Date(amortization.first_installment_date);
        // Ensure noon time to avoid timezone shifts
        firstInstallmentDate.setHours(12, 0, 0, 0);
      }
    } else {
      firstInstallmentDate = new Date();
      firstInstallmentDate.setHours(12, 0, 0, 0);
    }
    
    // Return properly initialized state
    return {
      loanAmount: amortization.loan_amount || 0,
      interestRate: amortization.interest_rate,
      termYears: amortization.term_years,
      installmentsPerYear: amortization.installments_per_year,
      firstInstallmentDate: firstInstallmentDate,
      propertyInsurance: property.property_insurance || 0,
      loanInsurance: amortization.loan_protection_insurance || 0
    };
  });
  
  // Watch form values for changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!values || !property) return;
      
      // Parse form values
      const downPayment = parseFloat(values.down_payment?.replace(/[^0-9.]/g, "") || "0");
      const loanAmount = property.price_cost - downPayment;
      const interestRate = parseFloat(values.interest_rate || "0");
      const termYears = parseInt(values.term_years || "0");
      const installmentsPerYear = parseInt(values.installments_per_year || "12");
      
      // Handle date properly to preserve the day of month regardless of timezone
      let firstInstallmentDate;
      
      if (values.first_installment_date) {
        // First create a date to get the components
        const tempDate = new Date(values.first_installment_date);
        // Then create a new date at noon to avoid timezone issues
        firstInstallmentDate = new Date(
          tempDate.getFullYear(),
          tempDate.getMonth(),
          tempDate.getDate(),
          12, 0, 0, 0
        );
      } else {
        // Default to today at noon
        const today = new Date();
        firstInstallmentDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          12, 0, 0, 0
        );
      }
      
      const loanInsurance = parseFloat(values.loan_protection_insurance || "0");
      
      // Update the local state with new values
      setFormValues({
        loanAmount: loanAmount,
        interestRate: interestRate,
        termYears: termYears,
        installmentsPerYear: installmentsPerYear,
        firstInstallmentDate: firstInstallmentDate,
        propertyInsurance: property.property_insurance || 0,
        loanInsurance: loanInsurance
      });
    });
    
    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [form, property]);

  // Use the useScenarioCalculations hook with the tracked form values
  const { data: scenarios, isLoading, error } = useScenarioCalculations({
    amortizationId: amortization.id,
    loanAmount: formValues.loanAmount,
    interestRate: formValues.interestRate,
    termYears: formValues.termYears,
    installmentsPerYear: formValues.installmentsPerYear,
    firstInstallmentDate: formValues.firstInstallmentDate,
    propertyInsurance: formValues.propertyInsurance,
    loanInsurance: formValues.loanInsurance
  })

  // For debugging: Log the payment data when it's available
  useEffect(() => {
    if (scenarios && formValues.installmentsPerYear === 14) {
      // Filter for July and December payments only for debugging
      const julyDecPayments = scenarios.regular?.payments.filter(payment => {
        const date = new Date(payment.payment_date);
        return date.getMonth() === 6 || date.getMonth() === 11;
      });
      
      console.log('DEBUG 14 installments - July/Dec payments:', julyDecPayments);
      console.log('DEBUG Regular payments sample:', scenarios.regular?.payments.slice(0, 3));
    }
  }, [scenarios, formValues.installmentsPerYear]);

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Payment Scenarios</h2>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Calculating scenarios...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Payment Scenarios</h2>
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-700">Error calculating scenarios: {error.message}</p>
          <p className="text-sm text-red-600 mt-2">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    )
  }

  // Helper function to transform payment rows for ScenarioTable
  const mapPaymentForTable = (payment: any) => {
    // Check if this is a double payment month (July or December)
    const paymentDate = new Date(payment.payment_date);
    const isDoublePaymentMonth = formValues.installmentsPerYear === 14 && 
      (paymentDate.getMonth() === 6 || paymentDate.getMonth() === 11);
    
    // Use the monthly_payment directly from the backend
    // The backend already doubles payments for July and December when installmentsPerYear is 14
    return {
      date: paymentDate,
      beginning_balance: payment.beginning_balance || 0,
      capital: payment.principal || payment.capital || 0,
      interest: payment.monthly_interest || payment.interest || 0,
      property_insurance: payment.property_insurance || 0,
      loan_insurance: payment.monthly_loan_insurance || payment.loan_insurance || 0,
      monthly_payment: payment.monthly_payment || 0,
      is_different_from_base: payment.is_different_from_base || false,
      is_double_payment: isDoublePaymentMonth
    };
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Payment Scenarios</h2>
      
      {firstInstallmentDebug && (
        <div className="bg-yellow-100 p-4 rounded mb-4 border border-yellow-400">
          <h3 className="font-semibold text-yellow-800">Debug: First Installment Date</h3>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <div><strong>Original value from DB:</strong> {firstInstallmentDebug.originalValue}</div>
            <div><strong>Parsed date:</strong> {firstInstallmentDebug.parsedDate}</div>
            <div><strong>Date components:</strong> Year: {firstInstallmentDebug.components.year}, Month: {firstInstallmentDebug.components.month}, Day: {firstInstallmentDebug.components.day}</div>
          </div>
        </div>
      )}
      
      <div className="mb-6 p-4 border-l-4 border-primary bg-muted rounded-md">
        <h3 className="text-lg font-semibold mb-2">Scenario Timelines</h3>
        <p className="mb-2">The four scenarios function as parallel timelines originating from the same starting point:</p>
        <ul className="space-y-1 text-sm">
          <li><span className="font-medium">Regular</span> – The main timeline and baseline scenario. Before any adjustments, all scenarios match this one.</li>
          <li><span className="font-medium">Accelerated</span> – Forks from Regular when extra installments are applied. Reduces total months while monthly payment stays the same.</li>
          <li><span className="font-medium">Lower Payment</span> – Forks from Regular when extra installments are applied. Reduces monthly payment while total months stays the same.</li>
          <li><span className="font-medium">New Rate</span> – Forks from Regular when a new refinancing rate is introduced. Can change both months and payment amount.</li>
        </ul>
        
        {formValues.installmentsPerYear === 14 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-200">
            <h4 className="text-sm font-semibold text-amber-800">Double Payment Option Selected</h4>
            <p className="text-sm text-amber-700">
              You've selected the 14 installments per year option. This means:
            </p>
            <ul className="mt-1 space-y-1 text-xs text-amber-700 list-disc pl-4">
              <li>Regular months: Standard monthly payment</li>
              <li>July and December: <strong>Double payments</strong> (2× the monthly amount)</li>
              <li>All insurance costs are also doubled in July and December</li>
              <li>Double payment months are highlighted in the payment tables</li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            Regular Scenario
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/20 text-primary">
              Baseline
            </span>
          </h3>
          {scenarios?.regular?.payments && scenarios.regular.payments.length > 0 && (
            <div className="p-2 bg-muted rounded text-xs mb-2">
              <p><b>Debug:</b> First payment date: {new Date(scenarios.regular.payments[0].payment_date).toLocaleDateString()} 
              ({new Date(scenarios.regular.payments[0].payment_date).toISOString()})</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.regular?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">{scenarios?.regular?.summary.total_months || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.regular?.summary.monthly_payment || 0, property.currency)}
                </p>
                {formValues.installmentsPerYear === 14 && (
                  <p className="text-xs text-amber-700">
                    (2× in July & December: {formatCurrency((scenarios?.regular?.summary.monthly_payment || 0) * 2, property.currency)})
                  </p>
                )}
              </div>
            </div>
            {scenarios?.regular?.payments && (
              <ScenarioTable
                rows={scenarios.regular.payments.map(mapPaymentForTable)}
                currency={property.currency}
                compareWithBaseScenario={false}
              />
            )}
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            Accelerated Scenario
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
              Reduces Term
            </span>
          </h3>
          {scenarios?.accelerated?.payments && scenarios.accelerated.payments.length > 0 && (
            <div className="p-2 bg-muted rounded text-xs mb-2">
              <p><b>Debug:</b> First payment date: {new Date(scenarios.accelerated.payments[0].payment_date).toLocaleDateString()}
              ({new Date(scenarios.accelerated.payments[0].payment_date).toISOString()})</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.accelerated?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">
                  {scenarios?.accelerated?.summary.total_months || 0}
                  {scenarios?.regular && scenarios?.accelerated && (
                    <span className="text-sm text-green-600 ml-1">
                      (-{scenarios.regular.summary.total_months - scenarios.accelerated.summary.total_months})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.accelerated?.summary.monthly_payment || 0, property.currency)}
                  {/* Same as Regular */}
                </p>
                {formValues.installmentsPerYear === 14 && (
                  <p className="text-xs text-amber-700">
                    (2× in July & December: {formatCurrency((scenarios?.accelerated?.summary.monthly_payment || 0) * 2, property.currency)})
                  </p>
                )}
              </div>
            </div>
            {scenarios?.accelerated?.payments && (
              <ScenarioTable
                rows={scenarios.accelerated.payments.map(mapPaymentForTable)}
                currency={property.currency}
                compareWithBaseScenario={true}
              />
            )}
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            Lower Payment Scenario
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
              Reduces Payment
            </span>
          </h3>
          {scenarios?.lower_payment?.payments && scenarios.lower_payment.payments.length > 0 && (
            <div className="p-2 bg-muted rounded text-xs mb-2">
              <p><b>Debug:</b> First payment date: {new Date(scenarios.lower_payment.payments[0].payment_date).toLocaleDateString()}
              ({new Date(scenarios.lower_payment.payments[0].payment_date).toISOString()})</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.lower_payment?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">
                  {scenarios?.lower_payment?.summary.total_months || 0}
                  {/* Same as Regular */}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.lower_payment?.summary.monthly_payment || 0, property.currency)}
                  {scenarios?.regular && scenarios?.lower_payment && (
                    <span className="text-sm text-blue-600 ml-1">
                      (-{formatCurrency(scenarios.regular.summary.monthly_payment - scenarios.lower_payment.summary.monthly_payment, property.currency)})
                    </span>
                  )}
                </p>
                {formValues.installmentsPerYear === 14 && (
                  <p className="text-xs text-amber-700">
                    (2× in July & December: {formatCurrency((scenarios?.lower_payment?.summary.monthly_payment || 0) * 2, property.currency)})
                  </p>
                )}
              </div>
            </div>
            {scenarios?.lower_payment?.payments && (
              <ScenarioTable
                rows={scenarios.lower_payment.payments.map(mapPaymentForTable)}
                currency={property.currency}
                compareWithBaseScenario={true}
              />
            )}
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            New Rate Scenario
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
              Refinancing
            </span>
          </h3>
          {scenarios?.new_rate?.payments && scenarios.new_rate.payments.length > 0 && (
            <div className="p-2 bg-muted rounded text-xs mb-2">
              <p><b>Debug:</b> First payment date: {new Date(scenarios.new_rate.payments[0].payment_date).toLocaleDateString()}
              ({new Date(scenarios.new_rate.payments[0].payment_date).toISOString()})</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.new_rate?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">
                  {scenarios?.new_rate?.summary.total_months || 0}
                  {scenarios?.regular && scenarios?.new_rate && (
                    <span className={`text-sm ml-1 ${scenarios.new_rate.summary.total_months > scenarios.regular.summary.total_months ? 'text-red-600' : 'text-green-600'}`}>
                      ({scenarios.new_rate.summary.total_months > scenarios.regular.summary.total_months ? '+' : '-'}
                      {Math.abs(scenarios.regular.summary.total_months - scenarios.new_rate.summary.total_months)})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios?.new_rate?.summary.monthly_payment || 0, property.currency)}
                  {scenarios?.regular && scenarios?.new_rate && (
                    <span className={`text-sm ml-1 ${scenarios.new_rate.summary.monthly_payment > scenarios.regular.summary.monthly_payment ? 'text-red-600' : 'text-blue-600'}`}>
                      ({scenarios.new_rate.summary.monthly_payment > scenarios.regular.summary.monthly_payment ? '+' : '-'}
                      {formatCurrency(Math.abs(scenarios.regular.summary.monthly_payment - scenarios.new_rate.summary.monthly_payment), property.currency)})
                    </span>
                  )}
                </p>
                {formValues.installmentsPerYear === 14 && (
                  <p className="text-xs text-amber-700">
                    (2× in July & December: {formatCurrency((scenarios?.new_rate?.summary.monthly_payment || 0) * 2, property.currency)})
                  </p>
                )}
              </div>
            </div>
            {scenarios?.new_rate?.payments && (
              <ScenarioTable
                rows={scenarios.new_rate.payments.map(mapPaymentForTable)}
                currency={property.currency}
                compareWithBaseScenario={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
