import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PropertySelect, Property, PropertyDisplay } from "@/components/mortgages/property-select"
import { SEO } from "@/components/seo"
import { amortizationFormSchema, type AmortizationFormValues, defaultValues } from "@/components/mortgages/schema"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"


import { cn, formatCurrency, formatDate, normalizeDate, createLocalDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ExtraInstallmentsSection } from "@/components/mortgages/extra-installments-section"

import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import type { Database } from "@/types/supabase"

import { NewRateForm } from "@/components/mortgages/new-rate-form"
import { useTranslation } from "react-i18next"
import {
  RegularScenarioPanel,
  AcceleratedScenarioPanel,
  LowerPaymentScenarioPanel,
  NewRateScenarioPanel
} from "@/components/amortizations/scenario-panels"
import { useNavigate } from "react-router-dom"
import React from "react"

import { MortgageDetailsForm } from "@/components/mortgages/mortgage-details-form"

// Fix DB types if needed (this is a temporary fix until types are updated)
type Mortgage = any; 
type ExtraInstallment = any;
type RateChange = any;

// Add property price and bonus cache interface
interface PropertyCache {
  [propertyId: string]: {
    price_cost: number;
    bonus: number;
  }
}

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
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [selectedMortgage, setSelectedMortgage] = useState<Mortgage | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // Add property cache state
  const [propertyCache, setPropertyCache] = useState<PropertyCache>({})
  
  const propertyForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      ...defaultValues,
      name: "Test Mortgage"
    },
  })

  const mortgageForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
  })

  // Add effect to handle loan protection insurance rates
  React.useEffect(() => {
    const type = mortgageForm.watch("loan_protection_type");
    
    // Only set default rates when type changes, not for manual inputs
    switch (type) {
      case "individual":
        mortgageForm.setValue("loan_protection_insurance", "0.028", {
          shouldValidate: true,
          shouldDirty: true
        });
        break;
      case "joint":
        mortgageForm.setValue("loan_protection_insurance", "0.052", {
          shouldValidate: true,
          shouldDirty: true
        });
        break;
      case "none":
        mortgageForm.setValue("loan_protection_insurance", "0", {
          shouldValidate: true,
          shouldDirty: true
        });
        break;
      // For custom type, don't override the value
    }
  }, [mortgageForm.watch("loan_protection_type")]);

  const { data: linkedMortgages = [], isLoading: isLoadingMortgages } = useQuery({
    queryKey: ["linked-mortgages", selectedProperty?.id],
    queryFn: async () => {
      if (!user || !selectedProperty) return []

      const { data, error } = await supabase
        .from("mortgages")
        .select("*")
        .eq("property_id", selectedProperty.id)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error fetching mortgages:", error)
        return []
      }

      return data as Mortgage[]
    },
    enabled: !!user && !!selectedProperty?.id,
  })

  useEffect(() => {
    checkAdminStatus()
  }, [])

  // Add a method to fetch and cache property bonus
  const fetchAndCachePropertyBonus = useCallback(async (propertyId: string): Promise<number> => {
    // Return cached bonus if available
    if (propertyCache[propertyId]?.bonus !== undefined) {
      return propertyCache[propertyId].bonus;
    }
    
    // Otherwise fetch from database
    try {
      const { data, error } = await supabase
        .rpc('property_bonus', { p_property_id: propertyId });
      
      if (error) {
        console.error("Error calculating property bonus:", error);
        return 0;
      }
      
      const bonus = data || 0;
      
      // Update cache with the fetched bonus
      setPropertyCache(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          bonus
        }
      }));
      
      return bonus;
    } catch (error) {
      console.error("Error fetching property bonus:", error);
      return 0;
    }
  }, [propertyCache]);

  // Get property price from cache or return default value
  const getPropertyPriceFromCache = useCallback((propertyId: string): number => {
    return propertyCache[propertyId]?.price_cost || 0;
  }, [propertyCache]);

  // Get property bonus from cache or return default value
  const getPropertyBonusFromCache = useCallback((propertyId: string): number => {
    return propertyCache[propertyId]?.bonus || 0;
  }, [propertyCache]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        toast({
          variant: "destructive",
          title: t("ui.error", { message: "Please login" })
        })
        navigate('/')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        toast({
          variant: "destructive",
          title: t("ui.error", { message: "Error fetching profile" })
        })
        navigate('/')
        return
      }

      if (!profile.is_admin) {
        toast({
          variant: "destructive",
          title: t("ui.error", { message: "Admin access only" })
        })
        navigate('/')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("ui.error", { message: "Error checking admin status" })
      })
      navigate('/')
    }
  }

  // If still checking admin status or not an admin, show loading
  if (isAdmin === null || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t("ui.loading")}</p>
      </div>
    )
  }

  const handlePropertyChange = (property: Property | null) => {
    setSelectedProperty(property)
    setSelectedMortgage(null)
    if (property) {
      setIsEditing(false)
      
      // Cache property price when a property is selected
      setPropertyCache(prev => ({
        ...prev,
        [property.id]: {
          ...prev[property.id],
          price_cost: property.price_cost
        }
      }));
      
      // Fetch and cache bonus
      fetchAndCachePropertyBonus(property.id);
    }
  }

  const handleMortgageSelect = (mortgage: Mortgage) => {
    setSelectedMortgage(mortgage)
    mortgageForm.reset({
      name: mortgage.name || "",
      property_id: mortgage.property_id,
      down_payment: mortgage.down_payment.toString(),
      interest_rate: mortgage.interest_rate.toString(),
      term_years: mortgage.term_years.toString(),
      installments_per_year: mortgage.installments_per_year.toString(),
      first_installment_date: createLocalDate(mortgage.first_installment_date),
      loan_protection_type: mortgage.loan_protection_type as "none" | "custom" | "individual" | "joint",
      loan_protection_insurance: mortgage.loan_protection_insurance?.toString(),
    })
  }

  const onUpdateMortgage = async (values: AmortizationFormValues) => {
    try {
      if (!selectedMortgage || !selectedProperty) {
        throw new Error("No mortgage or property selected")
      }

      // Parse numeric values safely
      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
      const interestRate = parseFloat(values.interest_rate)
      const termYears = parseInt(values.term_years)
      const installmentsPerYear = parseInt(values.installments_per_year)
      
      // Handle loan protection insurance based on type
      let loanProtectionInsurance = null;
      const loanProtectionType = values.loan_protection_type;
      
      switch (loanProtectionType) {
        case "individual":
          loanProtectionInsurance = 0.028;
          break;
        case "joint":
          loanProtectionInsurance = 0.052;
          break;
        case "custom":
          const rawValue = parseFloat(values.loan_protection_insurance || "0");
          if (isNaN(rawValue) || rawValue < 0 || rawValue > 1) {
            throw new Error("Invalid loan protection insurance amount (must be between 0 and 1)");
          }
          loanProtectionInsurance = rawValue;
          break;
        case "none":
          loanProtectionInsurance = 0;
          break;
        default:
          throw new Error("Invalid loan protection type");
      }

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

      // Get property bonus from cache or fetch if not available
      let bonus = getPropertyBonusFromCache(selectedProperty.id);
      if (bonus === 0) {
        bonus = await fetchAndCachePropertyBonus(selectedProperty.id);
      }
      
      // Calculate loan amount properly using cached values: (propertyCost - bonus) - downPayment
      const propertyCost = getPropertyPriceFromCache(selectedProperty.id) || selectedProperty.price_cost;
      const loanAmount = (propertyCost - bonus) - downPayment;

      // Validate loan amount
      if (loanAmount <= 0) {
        throw new Error("Down payment cannot be greater than property cost minus applicable bonus")
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
      
      console.log('Updating mortgage with date string:', dateString);
      console.log('Original date components:', {
        year: year,
        month: month + 1, // Display 1-based for logging
        day: day
      });
      
      // Prepare mortgage data
      const mortgageData = {
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

      // Update mortgage in Supabase
      const { error: updateError } = await supabase
        .from("mortgages")
        .update(mortgageData)
        .eq('id', selectedMortgage.id)

      if (updateError) {
        console.error("Error updating mortgage:", updateError)
        throw new Error(updateError.message)
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["linked-mortgages", selectedProperty.id]
      })
      await queryClient.invalidateQueries({
        queryKey: ["scenarios", selectedMortgage.id]
      })

      toast({
        title: "Success",
        description: "Mortgage updated successfully",
      })
    } catch (error) {
      console.error("Error updating mortgage:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "There was an error updating the mortgage"
      })
    }
  }

  const [mortgageSum, setMortgageSum] = useState<number>(0);
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState<number>(0);
  const [mortgageNotFoundError, setMortgageNotFoundError] = useState<boolean>(false);

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">Test Extra Installments</h1>
      }}
    >
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
                    {selectedProperty && (
                      <PropertyDisplay 
                        property={selectedProperty} 
                        onPropertyUpdate={(updatedProperty) => {
                          // Update the cache with the new property values
                          setPropertyCache(prev => ({
                            ...prev,
                            [updatedProperty.id]: {
                              ...prev[updatedProperty.id],
                              price_cost: updatedProperty.price_cost
                            }
                          }));
                          
                          // Fetch and update bonus for the updated property
                          fetchAndCachePropertyBonus(updatedProperty.id);
                          
                          setSelectedProperty(updatedProperty);
                          // Refresh linked mortgages if needed
                          queryClient.invalidateQueries({
                            queryKey: ["linked-mortgages", updatedProperty.id]
                          });
                        }}
                      />
                    )}
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
                  <p><span className="font-medium">Cached Bonus:</span> {getPropertyBonusFromCache(selectedProperty.id)}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No property selected</p>
              )}
            </div>
          </div>
        </div>

        {selectedProperty && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Mortgages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">Linked Mortgages</h3>
                <div className="space-y-4">
                  {isLoadingMortgages ? (
                    <p className="text-muted-foreground">Loading mortgages...</p>
                  ) : linkedMortgages.length > 0 ? (
                    linkedMortgages.map((mortgage) => (
                      <div
                        key={mortgage.id}
                        className={`p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors ${
                          selectedMortgage?.id === mortgage.id ? 'border-primary' : ''
                        }`}
                        onClick={() => handleMortgageSelect(mortgage)}
                      >
                        <h4 className="font-medium">{mortgage.name || "Unnamed"}</h4>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>Loan Amount: {formatCurrency(mortgage.loan_amount || 0, selectedProperty.currency)}</p>
                          <p>Interest Rate: {mortgage.interest_rate}%</p>
                          <p>First Payment: {formatDate(createLocalDate(mortgage.first_installment_date))}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No mortgages found for this property.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">Mortgage Details</h3>
                <div className="p-6 border rounded-lg">
                  {selectedMortgage ? (
                    <Form {...mortgageForm}>
                      <MortgageDetailsForm
                        form={mortgageForm}
                        selectedProperty={selectedProperty}
                        onSubmit={onUpdateMortgage}
                        submitLabel="Update"
                        onLoanAmountChange={(amount: number) => {
                          setCalculatedLoanAmount(amount);
                        }}
                        propertyBonus={getPropertyBonusFromCache(selectedProperty.id || '')}
                      />
                    </Form>
                  ) : (
                    <p className="text-muted-foreground">Select a mortgage to view details</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMortgage && selectedProperty && (
          <>
            <div className="mt-8">
              <ExtraInstallmentsSection
                mortgageId={selectedMortgage.id}
                currency={selectedProperty.currency}
                loanAmount={selectedMortgage.loan_amount}
                onInstallmentsChange={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["linked-mortgages", selectedProperty.id]
                  })
                  queryClient.invalidateQueries({
                    queryKey: ["scenarios", selectedMortgage.id]
                  })
                }}
                firstInstallmentDate={selectedMortgage.first_installment_date ? new Date(selectedMortgage.first_installment_date) : undefined}
              />
            </div>

            <div className="mt-8">
              <NewRateForm
                mortgageId={selectedMortgage.id}
                onSuccess={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["linked-mortgages", selectedProperty.id]
                  })
                  queryClient.invalidateQueries({
                    queryKey: ["scenarios", selectedMortgage.id]
                  })
                }}
                className="space-y-4"
                firstInstallmentDate={selectedMortgage.first_installment_date ? new Date(selectedMortgage.first_installment_date) : undefined}
              />
            </div>

            <ScenarioCalculationsSection 
              mortgage={selectedMortgage}
              property={selectedProperty}
              form={mortgageForm}
              propertyCache={propertyCache}
              getPropertyBonusFromCache={getPropertyBonusFromCache}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function ScenarioCalculationsSection({ 
  mortgage,
  property,
  form,
  propertyCache,
  getPropertyBonusFromCache
}: { 
  mortgage: Mortgage
  property: Property
  form: ReturnType<typeof useForm<AmortizationFormValues>>
  propertyCache: PropertyCache
  getPropertyBonusFromCache: (propertyId: string) => number
}) {
  // Add state to track the current rate changes
  const [rateChangeKey, setRateChangeKey] = useState(0);
  const [rateChanges, setRateChanges] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Debug information for first installment date
  const firstInstallmentDebug = useMemo(() => {
    // We no longer need this debug information
    return null;
  }, [mortgage?.first_installment_date]);

  // Add effect to fetch rate changes
  useEffect(() => {
    if (!mortgage?.id) return;
    
    const fetchRateChanges = async () => {
      const { data, error } = await supabase
        .from("new_rates")
        .select("*")
        .eq("mortgage_id", mortgage.id)
        .order("effective_date", { ascending: true });
        
      if (error) {
        console.error("Error fetching rate changes:", error);
        return;
      }
      
      setRateChanges(data || []);
    };
    
    fetchRateChanges();
  }, [mortgage?.id]);

  // Add subscription to rate changes
  useEffect(() => {
    if (!mortgage?.id) return;
    
    // Subscribe to changes to new_rates table for this mortgage
    const channel = supabase
      .channel(`new_rates_mortgage_${mortgage.id}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'new_rates',
          filter: `mortgage_id=eq.${mortgage.id}`
        },
        (payload) => {
          // Force a refetch of scenarios when rates change
          queryClient.invalidateQueries({
            queryKey: ["scenarios", mortgage.id]
          });
          
          // Update key to force re-render
          setRateChangeKey(prev => prev + 1);
          
          // Fetch the updated rate changes
          const fetchRateChanges = async () => {
            const { data, error } = await supabase
              .from("new_rates")
              .select("*")
              .eq("mortgage_id", mortgage.id)
              .order("effective_date", { ascending: true });
              
            if (error) {
              console.error("Error fetching rate changes:", error);
              return;
            }
            
            setRateChanges(data || []);
          };
          
          fetchRateChanges();
        }
      )
      .subscribe();
    
    return () => {
      // Clean up subscription
      channel.unsubscribe();
    };
  }, [mortgage?.id, queryClient]);

  // Create a local state to track form values for live calculations
  const [formValues, setFormValues] = useState(() => {
    // Parse the first installment date properly to avoid timezone shifts
    let firstInstallmentDate;
    
    if (mortgage.first_installment_date) {
      // Check if the date is in YYYY-MM-DD format
      const dateMatch = mortgage.first_installment_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        // Create a date from parts to avoid timezone issues
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // Convert to 0-indexed month for Date constructor
        const day = parseInt(dateMatch[3]);
        firstInstallmentDate = new Date(year, month, day, 12, 0, 0, 0);
      } else {
        // Fallback to regular date parsing
        firstInstallmentDate = new Date(mortgage.first_installment_date);
        // Ensure noon time to avoid timezone shifts
        firstInstallmentDate.setHours(12, 0, 0, 0);
      }
    } else {
      firstInstallmentDate = new Date();
      firstInstallmentDate.setHours(12, 0, 0, 0);
    }
    
    // Return properly initialized state
    return {
      loanAmount: mortgage.loan_amount || 0,
      interestRate: mortgage.interest_rate,
      termYears: mortgage.term_years,
      installmentsPerYear: mortgage.installments_per_year,
      firstInstallmentDate: firstInstallmentDate,
      propertyInsurance: property.property_insurance || 0,
      loanInsurance: mortgage.loan_protection_insurance || 0
    };
  });
  
  // Watch form values for changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!values || !property) return;
      
      // Parse form values
      const downPayment = parseFloat(values.down_payment?.replace(/[^0-9.]/g, "") || "0");
      
      // Calculate loan amount based on property price, bonus, and down payment using cached values
      let loanAmount: number;
      
      // If we're modifying an existing mortgage, check if its loan amount should be used
      if (mortgage.loan_amount && !form.formState.dirtyFields.down_payment) {
        // Use the stored loan amount if down payment hasn't changed
        loanAmount = mortgage.loan_amount;
      } else {
        // Use cached property price and bonus for calculation
        const propertyPrice = propertyCache[property.id]?.price_cost || property.price_cost;
        const bonus = getPropertyBonusFromCache(property.id);
        
        // Calculate loan amount using cached values
        loanAmount = (propertyPrice - bonus) - downPayment;
      }
      
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
      setFormValues(prev => ({
        ...prev,
        interestRate: interestRate,
        termYears: termYears,
        installmentsPerYear: installmentsPerYear,
        firstInstallmentDate: firstInstallmentDate,
        propertyInsurance: property.property_insurance || 0,
        loanInsurance: loanInsurance,
        // Only update loanAmount if we're using the immediate calculation
        ...(mortgage.loan_amount && !form.formState.dirtyFields.down_payment ? {} : { loanAmount })
      }));
    });
    
    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [form, property, mortgage.loan_amount, propertyCache, getPropertyBonusFromCache]);

  // Use the useScenarioCalculations hook with the tracked form values
  // Include rateChangeKey as part of the dependencies to force refresh when rates change
  const { data: scenarios, isLoading, error } = useScenarioCalculations({
    mortgageId: mortgage.id,
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
    // No longer needed
  }, [scenarios, formValues.installmentsPerYear]);

  // Find the first rate change to pass to the new rate scenario
  const firstRateChange = rateChanges.length > 0 ? rateChanges[0] : null;
  const rateChangeInfo = firstRateChange ? {
    effectiveDate: firstRateChange.effective_date,
    newInterestRate: firstRateChange.new_interest_rate,
    newTermYears: firstRateChange.new_term_years
  } : undefined;

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
    const paymentDate = new Date(payment.payment_date);
    const isDoublePaymentMonth = formValues.installmentsPerYear === 14 && 
      (paymentDate.getMonth() === 6 || paymentDate.getMonth() === 11);
    
    const capital = payment.principal || payment.capital || 0;
    const interest = payment.monthly_interest || payment.interest || 0;
    const loanInsurance = payment.monthly_loan_insurance || payment.loan_insurance || 0;
    
    return {
      date: paymentDate,
      beginning_balance: payment.beginning_balance || 0,
      capital,
      interest,
      property_insurance: payment.property_insurance || 0,
      loan_insurance: loanInsurance,
      monthly_payment: payment.monthly_payment || 0,
      ending_balance: payment.ending_balance || 0,
      is_different_from_base: payment.is_different_from_base || false,
      is_double_payment: isDoublePaymentMonth
    };
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Payment Scenarios</h2>
      
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RegularScenarioPanel
            scenario={scenarios?.regular}
            currency={property.currency}
            installmentsPerYear={formValues.installmentsPerYear}
            mapPaymentForTable={mapPaymentForTable}
          />

          <AcceleratedScenarioPanel
            scenario={scenarios?.accelerated}
            regularScenario={scenarios?.regular}
            currency={property.currency}
            installmentsPerYear={formValues.installmentsPerYear}
            mapPaymentForTable={mapPaymentForTable}
          />

          <LowerPaymentScenarioPanel
            scenario={scenarios?.lower_payment}
            regularScenario={scenarios?.regular}
            currency={property.currency}
            installmentsPerYear={formValues.installmentsPerYear}
            mapPaymentForTable={mapPaymentForTable}
          />

          <NewRateScenarioPanel
            scenario={scenarios?.new_rate}
            regularScenario={scenarios?.regular}
            currency={property.currency}
            installmentsPerYear={formValues.installmentsPerYear}
            mapPaymentForTable={mapPaymentForTable}
          />
        </div>
      </Form>
    </div>
  )
}
