import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect, useCallback, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

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
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PropertySelect, type Property } from "@/components/mortgages/property-select"
import { MortgageDetailsForm } from "@/components/mortgages/mortgage-details-form"

import { 
  mortgageFormSchema, 
  defaultValues, 
  type MortgageFormValues 
} from "@/components/mortgages/schema"
import { LoanCalculator } from "@/services/mortgages/calculations/loan"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import type { ScenarioResult, BonusRule } from "@/services/mortgages/types/common"
import { NoMoreSpace } from "@/components/common/NoMoreSpace"
import { useSubscriptionLimits, DEFAULT_SUBSCRIPTION_PLANS } from "@/hooks/useSubscriptionLimits"
import { normalizeDate } from "@/lib/utils"
import { ScenarioCalculator } from "@/services/mortgages/services/scenarioCalculator"

// Add property cache interface
interface PropertyCache {
  [propertyId: string]: {
    price_cost: number;
    bonus: number;
  }
}

export default function NewMortgage() {
  const { t } = useTranslation(['mortgages', 'dashboard', 'global'])
  const { t: tMortgages } = useTranslation('mortgages')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  
  // Extract propertyId from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const propertyIdFromUrl = queryParams.get('propertyId')
  
  // Form setup with default values
  const form = useForm<MortgageFormValues>({
    resolver: zodResolver(mortgageFormSchema),
    defaultValues: {
      ...defaultValues,
      property_id: propertyIdFromUrl || ""
    },
    mode: "onChange"
  })
  
  // Property selection state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  
  // Replace property bonus state with property cache
  const [propertyCache, setPropertyCache] = useState<PropertyCache>({})
  
  // Loan amount calculation (derived from property, down payment, and bonus)
  const [loanAmount, setLoanAmount] = useState(0)
  
  // Subscription limits hooks and state
  const {
    isLoading: isCheckingLimits,
    hasReachedLimit,
    currentUsage,
    planLimit,
    currentPlan,
    nextPlan,
    checkLimit
  } = useSubscriptionLimits();
  
  const [isLimitCheckDone, setIsLimitCheckDone] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [mortgageCount, setMortgageCount] = useState(0);
  const limitCheckRef = useRef(false);
  
  // State to track if form is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize loan calculator
  const loanCalculator = new LoanCalculator();
  
  // Helper function to create property object for calculator
  const createCalculatorProperty = (property: Property) => {
    return {
      id: property.id,
      name: property.name,
      price_cost: property.price_cost,
      currency: property.currency,
      property_insurance: property.property_insurance || 0,
      property_insurance_type: property.property_insurance_type || 'auto',
      is_first_home: property.is_first_home || false,
      is_sustainable: property.is_sustainable || false
    };
  };
  
  // Add method to fetch and cache property bonus
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
  
  // Direct count from database for checking limits
  const getMortgageCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (e) {
      return 0;
    }
  }, [user]);

  // Function to check limits once
  const checkLimitOnce = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (limitCheckRef.current) return false;
    limitCheckRef.current = true;
    
    try {
      // 1. Get direct count from database
      const { count, error } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id || '');

      if (error) {
        return false;
      }
      
      // Store the count
      const currentCount = count || 0;
      setMortgageCount(currentCount);
      
      // 2. Determine the user's plan limit
      const limitValue = planLimit > 0 ? planLimit : 
                        (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3);
      
      // 3. Simple comparison to determine if limit is reached
      const limitReached = currentCount >= limitValue;
      
      // 4. Set state based on the check
      setIsLimitReached(limitReached);
      return limitReached;
    } catch (err) {
      return false;
    } finally {
      setIsLimitCheckDone(true);
    }
  }, [user?.id, planLimit, currentPlan]);
  
  // Run the limit check when component mounts
  useEffect(() => {
    if (!isLimitCheckDone && user?.id && currentPlan) {
      checkLimitOnce();
    }
  }, [checkLimitOnce, isLimitCheckDone, user?.id, currentPlan]);

  // Replace property bonus effect with updateLoanAmount using cache
  useEffect(() => {
    if (!selectedProperty) return;
    
    // Cache property price when a property is selected
    setPropertyCache(prev => ({
      ...prev,
      [selectedProperty.id]: {
        ...prev[selectedProperty.id],
        price_cost: selectedProperty.price_cost
      }
    }));
    
    // Fetch and cache bonus, then update loan amount
    fetchAndCachePropertyBonus(selectedProperty.id)
      .then(() => updateLoanAmount());
      
  }, [selectedProperty]);
  
  // Function to update loan amount based on property, bonus, and down payment
  const updateLoanAmount = useCallback(() => {
    if (!selectedProperty) return;
    
    const downPayment = parseFloat(form.getValues("down_payment")?.replace(/[^0-9.]/g, "") || "0");
    
    // Use cached values for property price and bonus
    const propertyPrice = getPropertyPriceFromCache(selectedProperty.id) || selectedProperty.price_cost;
    const bonus = getPropertyBonusFromCache(selectedProperty.id);
    
    // Calculate loan amount: (property_cost - bonus) - down_payment
    const calculatedLoanAmount = (propertyPrice - bonus) - downPayment;
    
    setLoanAmount(calculatedLoanAmount > 0 ? calculatedLoanAmount : 0);
  }, [selectedProperty, getPropertyPriceFromCache, getPropertyBonusFromCache, form]);
  
  // Update loan amount when form fields change
  useEffect(() => {
    // Subscribe to form changes with a WatchObserver callback
    const subscription = form.watch(() => {
      updateLoanAmount();
    });
    
    // Clean up subscription on unmount
    return () => subscription.unsubscribe();
  }, [form, updateLoanAmount]);

  // Add loan protection type watcher effect
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Only respond to loan_protection_type changes
      if (name === 'loan_protection_type') {
        const type = value.loan_protection_type;
        
        switch (type) {
          case "individual":
            form.setValue("loan_protection_insurance", "0.028", {
              shouldValidate: true,
              shouldDirty: true
            });
            break;
          case "joint":
            form.setValue("loan_protection_insurance", "0.052", {
              shouldValidate: true,
              shouldDirty: true
            });
            break;
          case "none":
            form.setValue("loan_protection_insurance", "0", {
              shouldValidate: true,
              shouldDirty: true
            });
            break;
          // For custom type, don't override the value
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Fetch property if propertyId is provided in URL
  useEffect(() => {
    const fetchPropertyFromUrl = async () => {
      if (!propertyIdFromUrl || !user) return
      
      try {
        const { data, error } = await supabase
          .from("properties")
          .select(`
            id,
            name,
            description,
            currency,
            price_cost,
            is_first_home,
            is_sustainable,
            property_insurance,
            property_insurance_type
          `)
          .eq("id", propertyIdFromUrl)
          .single()
          
        if (error) throw error
        if (data) {
          // Set the selected property
          handlePropertyChange(data as unknown as Property)
          
          // Set a default name for the mortgage based on the property name
          const defaultMortgageName = `${data.name} ${t("amortization.new_name")}`
          form.setValue("name", defaultMortgageName, { shouldValidate: true })
        }
      } catch (error) {
        // Silent error handling
      }
    }
    
    fetchPropertyFromUrl()
  }, [propertyIdFromUrl, user, form, t]);

  // Handler for property selection
  const handlePropertyChange = useCallback((property: Property | null) => {
    setSelectedProperty(property)
    if (property) {
      form.setValue("property_id", property.id, { shouldValidate: true })
      
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
    } else {
      form.setValue("property_id", "", { shouldValidate: true })
    }
  }, [form, fetchAndCachePropertyBonus]);

  // Watch the form's name field for breadcrumb display
  const amortizationName = form.watch("name")
  
  // Handle form submission
  const handleFormSubmit = async (values: MortgageFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if (!selectedProperty) {
        toast({
          variant: "destructive",
          title: t("ui.error", { ns: "global" }),
          description: t("messages.please_complete_all_fields", { ns: "mortgages" }),
        });
        setIsSubmitting(false);
        return;
      }
      
      // Check limits before proceeding
      const currentCount = await getMortgageCount();
      const limitValue = planLimit > 0 ? planLimit : 
                        (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3);
      
      if (currentCount >= limitValue) {
        toast({
          variant: "destructive",
          title: t("ui.error", { ns: "global" }),
          description: "You have reached your plan limit for mortgages",
        });
        setIsLimitReached(true);
        setIsSubmitting(false);
        return;
      }
      
      // Parse form values
      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""));
      const interestRate = parseFloat(values.interest_rate);
      const termYears = parseInt(values.term_years);
      const installmentsPerYear = parseInt(values.installments_per_year);
      
      // Check for valid values
      if (isNaN(downPayment) || downPayment < 0) {
        throw new Error("Invalid down payment amount");
      }
      if (isNaN(interestRate) || interestRate <= 0) {
        throw new Error("Invalid interest rate");
      }
      if (isNaN(termYears) || termYears <= 0) {
        throw new Error("Invalid term years");
      }
      if (![12, 14].includes(installmentsPerYear)) {
        throw new Error("Invalid installments per year");
      }
      
      // Handle date
      const firstInstallmentDate = values.first_installment_date ? 
        normalizeDate(new Date(values.first_installment_date)) : 
        normalizeDate(new Date());
      
      // Format date for database
      const dateString = `${firstInstallmentDate.getFullYear()}-${String(firstInstallmentDate.getMonth() + 1).padStart(2, '0')}-${String(firstInstallmentDate.getDate()).padStart(2, '0')}`;
      
      // Handle loan protection insurance
      let loanProtectionInsurance: number;
      switch (values.loan_protection_type) {
        case "individual":
          loanProtectionInsurance = 0.028;
          break;
        case "joint":
          loanProtectionInsurance = 0.052;
          break;
        case "custom":
          const customValue = parseFloat(values.loan_protection_insurance || "0");
          if (isNaN(customValue) || customValue < 0 || customValue > 1) {
            throw new Error("Invalid loan protection insurance amount");
          }
          loanProtectionInsurance = customValue;
          break;
        case "none":
        default:
          loanProtectionInsurance = 0;
          break;
      }
      
      // Calculate scenario values using ScenarioCalculator
      const scenarios = ScenarioCalculator.calculateScenarios({
        loan_amount: loanAmount,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        first_installment_date: firstInstallmentDate,
        property_insurance: selectedProperty.property_insurance || 0,
        loan_insurance: loanProtectionInsurance
      });
      
      // Get the regular scenario
      const regularScenario = scenarios.regular;
      
      console.log("Calculated scenario:", {
        total_interest_and_insurance: regularScenario.summary.total_interest_and_insurance,
        total_months: regularScenario.summary.total_months,
        monthly_payment: regularScenario.summary.monthly_payment,
        breakeven_point: regularScenario.summary.breakeven_point
      });
      
      // Create mortgage object
      const mortgageData = {
        name: values.name,
        property_id: selectedProperty.id,
        user_id: user?.id,
        loan_amount: loanAmount,
        down_payment: downPayment,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: loanProtectionInsurance,
        first_installment_date: dateString,
        saved_scenario: "regular",
        saved_scenario_total_interest_and_insurance: regularScenario.summary.total_interest_and_insurance || 0,
        saved_scenario_total_months: regularScenario.summary.total_months || 0,
        saved_scenario_monthly_payment: regularScenario.summary.monthly_payment || 0,
        saved_scenario_breakeven_point: regularScenario.summary.breakeven_point || null
      };
      
      // Save mortgage to database
      const { data, error } = await supabase
        .from("mortgages")
        .insert(mortgageData)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: t("ui.success", { ns: "global" }),
        description: t("messages.amortization_created", { ns: "mortgages" }),
      });
      
      // Navigate to the new mortgage
      navigate(`/mortgages/${data.id}`);
      
    } catch (error) {
      console.error("Error creating mortgage:", error);
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: error instanceof Error ? error.message : t("messages.error_creating_amortization", { ns: "mortgages" }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we haven't checked limits yet, show a loading state
  if (!isLimitCheckDone) {
    return (
      <DashboardLayout
        header={{
          title: (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Link to="/mortgages" className="transition-colors hover:text-foreground">
                    {t("sections.mortgages", { ns: "dashboard" })}
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {t("amortization.new", { ns: "mortgages" })}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        }}
      >
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  // If user has reached their mortgage limit, show the NoMoreSpace component
  if (isLimitReached) {
    return (
      <DashboardLayout
        header={{
          title: (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Link to="/mortgages" className="transition-colors hover:text-foreground">
                    {t("sections.mortgages", { ns: "dashboard" })}
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {t("amortization.new", { ns: "mortgages" })}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        }}
      >
        <div className="flex items-center justify-center p-6">
          <NoMoreSpace
            resourceType="mortgage"
            currentUsage={mortgageCount}
            planLimit={planLimit > 0 ? planLimit : (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3)}
            currentPlan={currentPlan}
            nextPlan={nextPlan}
            onBack={() => navigate("/mortgages")}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{
        title: (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/mortgages" className="transition-colors hover:text-foreground">
                  {t("sections.mortgages", { ns: "dashboard" })}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {amortizationName || t("amortization.new", { ns: "mortgages" })}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <Form {...form}>
        <div className="flex flex-col min-h-screen">
          <div className="flex flex-col md:flex-row flex-1">
            {/* Left Container */}
            <div className="w-full md:w-[40%] md:min-w-[320px] md:max-w-[540px] relative flex-shrink-0">
              <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
              <div className="p-6 space-y-6">
                <PropertySelect 
                  form={form} 
                  onPropertyChange={handlePropertyChange}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("amortization.label", { ns: "mortgages" })}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("amortization.name", { ns: "mortgages" })} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProperty && (
                  <>
                    <Separator />
                    
                    <MortgageDetailsForm
                      form={form}
                      selectedProperty={selectedProperty}
                      onSubmit={handleFormSubmit}
                      isSubmitting={isSubmitting}
                      submitLabel={t("ui.create", { ns: "global" })}
                      propertyBonus={getPropertyBonusFromCache(selectedProperty.id || '')}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right Container */}
            <div className="w-full overflow-hidden flex-1 p-1 md:p-2 lg:p-4">
              <div className="flex w-full flex-1 p-1 md:p-2 lg:p-4 items-center justify-center h-full">
                <div className="flex flex-col gap-4 p-4 rounded-md border border-amber-400/10 bg-amber-500/5 -mt-16 w-3/4">
                  <div className="text-sm text-amber-600">
                    {t("messages.save_to_access_all_features", { ns: "mortgages" })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </DashboardLayout>
  )
} 