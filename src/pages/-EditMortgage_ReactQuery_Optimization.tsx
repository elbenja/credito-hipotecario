import { useNavigate, useParams, Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EditableHeading } from "@/components/ui/editable-heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PropertyDisplay } from "@/components/mortgages/property-select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { MortgageDetailsForm } from "@/components/mortgages/mortgage-details-form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { mortgageFormSchema, type MortgageFormValues } from "@/components/mortgages/schema"
import { useToast } from "@/components/ui/use-toast"
import { createLocalDate, normalizeDate, parseDatabaseDate } from "@/utils/utils"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import { 
  RegularPanelGraph,
  AcceleratedPanelGraph,
  LowerPaymentPanelGraph,
  NewRatePanelGraph 
} from '@/components/mortgages/scenario-panels/graph-panels'
import { ExtraInstallmentsSection } from '@/components/mortgages/extra-installments-section'
import { NewRateForm } from '@/components/mortgages/new-rate-form'
import { useMemo, useCallback, useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { Heart } from "lucide-react"
import { ScenarioResult } from "@/types/common"
import SVGfixed from "@/components/ui/svg-fixed"
import { LoanCalculator } from "@/utils/calculations/mortgage/loan"
import React from "react"
import { useMortgageBundle } from "@/hooks/useMortgageBundle"
import type { Property } from "@/components/mortgages/property-select"

export default function EditMortgage() {
  const { t } = useTranslation()
  const { t: tMortgages } = useTranslation('mortgages')
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const location = useLocation()
  
  // Extract propertyId from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const propertyIdFromUrl = queryParams.get('propertyId')
  const tabFromUrl = queryParams.get('tab')
  const [selectedPropertyFromUrl, setSelectedPropertyFromUrl] = useState<Property | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(!id)
  // Add state to store calculated loan amount from form
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState<number>(0)
  
  // Get the current exchange rate
  const { data: exchangeRate } = useExchangeRate()

  // Add a loading state for the form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Add state to track if the form is ready with data
  const [formIsReady, setFormIsReady] = useState(false);
  
  // Add state to track which tab is active - initialize with URL parameter if available
  // Initialize with a ref to avoid re-renders during initialization
  const initialTabSet = React.useRef(false);
  const [activeTab, setActiveTab] = useState(tabFromUrl && ["regular", "accelerated", "lower_payment", "new_rate"].includes(tabFromUrl) 
    ? tabFromUrl 
    : "regular");
  
  // Add state to track saved scenario with localStorage persistence
  const [savedScenario, setSavedScenario] = useState(() => {
    // Try to get the saved scenario from localStorage for this mortgage
    const savedValue = localStorage.getItem(`savedScenario_${id}`);
    // Default to "regular" if nothing is saved
    return savedValue || "regular";
  });
  
  // Revised effect to set active tab to match the saved scenario when component loads
  // This prevents infinite loops by only running once
  useEffect(() => {
    // Skip if we've already set the initial tab or we have a tab from URL
    if (initialTabSet.current || tabFromUrl) {
      return;
    }
    
    // If we have a saved scenario, use it
    if (savedScenario && savedScenario !== activeTab) {
      setActiveTab(savedScenario);
    }
    
    // Mark as initialized
    initialTabSet.current = true;
  }, [savedScenario, activeTab, tabFromUrl]);

  const mortgageForm = useForm<MortgageFormValues>({
    resolver: zodResolver(mortgageFormSchema),
    // Set initial values for new mortgage if we have property from URL
    defaultValues: {
      property_id: propertyIdFromUrl || "",
      name: "",
      down_payment: "",
      interest_rate: "",
      term_years: "30",
      installments_per_year: "12",
      first_installment_date: new Date(),
      loan_protection_type: "none",
      loan_protection_insurance: "0",
    }
  })

  // Add a loan calculator instance for the entire component
  const loanCalculator = new LoanCalculator();
  
  // Update the exchange rate in the calculator when it changes
  useEffect(() => {
    if (exchangeRate) {
      loanCalculator.setExchangeRate(exchangeRate);
    }
  }, [exchangeRate]);

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

  // Add state for cached property values
  const [cachedPropertyData, setCachedPropertyData] = useState<{
    price_cost: number;
    bonus: number;
    id: string;
  } | null>(null);

  // Replace the getPropertyBonusFromCache function to use the bundle
  const getPropertyBonusFromCache = (propertyId: string): number => {
    if (!mortgageBundle || mortgageBundle.property.id !== propertyId) {
      return 0;
    }
    return mortgageBundle.property.bonus || 0;
  };

  // Replace the getPropertyPriceFromCache function to use the bundle
  const getPropertyPriceFromCache = (propertyId: string): number => {
    if (!mortgageBundle || mortgageBundle.property.id !== propertyId) {
      return 0;
    }
    return mortgageBundle.property.price_cost || 0;
  };

  // Update the property fetch effect for new mortgages
  useEffect(() => {
    if (isCreatingNew && propertyIdFromUrl && user) {
      // We're creating a new mortgage with a property ID from URL
      // We'll need to fetch the property directly since we don't have a bundle
      const fetchProperty = async () => {
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
            .single();
            
          if (error) throw error;
          if (data) {
            // Set the selected property
            setSelectedPropertyFromUrl(data as unknown as Property);
            
            // Update form with property information
            mortgageForm.setValue("property_id", data.id, { shouldValidate: true });
            
            // Set a default name for the mortgage based on the property name
            const defaultMortgageName = `${data.name} Mortgage`;
            mortgageForm.setValue("name", defaultMortgageName, { shouldValidate: true });
            
            // Calculate bonus
            const bonus = await loanCalculator.getPropertyBonus(supabase, data.id);
            
            // Update cached data
            setCachedPropertyData({
              price_cost: data.price_cost,
              bonus,
              id: data.id
            });
          }
        } catch (error) {
          console.error("Error fetching property:", error);
        }
      };
      
      fetchProperty();
    }
  }, [propertyIdFromUrl, user, mortgageForm, isCreatingNew]);

  // Handle property update callback - Modified to use LoanCalculator
  const handlePropertyUpdate = useCallback(async (updatedProperty: Property) => {
    if (!id || !user) {
      // Just invalidate the query for new mortgages
      queryClient.invalidateQueries({ queryKey: ["mortgage", id] });
      return;
    }
    
    try {
      // Create a compatible property object for the LoanCalculator
      const propertyForCalculator = createCalculatorProperty(updatedProperty);
      
      // Get current mortgage for down payment
      const { data: mortgageData, error: mortgageError } = await supabase
        .from("mortgages")
        .select("down_payment")
        .eq("id", id)
        .single();
      
      if (mortgageError) throw mortgageError;
      const downPayment = mortgageData?.down_payment || 0;
      
      // Use the new recalculateMortgageFromProperty method
      await loanCalculator.recalculateMortgageFromProperty(supabase, propertyForCalculator.id, propertyForCalculator);
      
      // Then invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["mortgage", id] });
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
      
      // Get the property bonus
      const bonusAmount = await loanCalculator.getPropertyBonus(supabase, propertyForCalculator.id);
      
      // Calculate new loan amount
      const newLoanAmount = await loanCalculator.calculateLoanAmount(supabase, propertyForCalculator, downPayment);
      
      setScenarioInputs(prev => ({
        ...prev,
        loanAmount: newLoanAmount,
        propertyInsurance: updatedProperty.property_insurance || 0
      }));
      
      // Update the cached values
      setCachedPropertyData({
        price_cost: updatedProperty.price_cost,
        bonus: bonusAmount,
        id: updatedProperty.id
      });
      
    } catch (error) {
      console.error("Error updating mortgage after property update:", error);
    }
  }, [queryClient, id, user, loanCalculator]);

  // Initial state for scenario inputs
  const [scenarioInputs, setScenarioInputs] = useState({
    mortgageId: id || "",
    loanAmount: 0,
    interestRate: 0,
    termYears: 0,
    installmentsPerYear: 12,
    firstInstallmentDate: undefined as Date | undefined,
    propertyInsurance: 0,
    loanInsurance: 0
  });

  // Add loan protection type watcher effect
  useEffect(() => {
    const type = mortgageForm.watch("loan_protection_type");
    
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

  const { data: mortgageBundle, isLoading, error: mortgageError } = useMortgageBundle(id || null);

  // Update the references to mortgage and property to use the bundle
  const mortgage = mortgageBundle?.mortgage;
  const property = mortgageBundle?.property;

  // Helper function to get consistently formatted mortgage form values
  const getFormattedMortgageValues = () => {
    return {
      mortgageId: id || "",
      loanAmount: calculatedLoanAmount,
      downPayment: parseFloat(mortgageForm.getValues().down_payment?.replace(/[^0-9.]/g, "") || "0"),
      interestRate: parseFloat(mortgageForm.getValues().interest_rate || "0"),
      termYears: parseInt(mortgageForm.getValues().term_years || "0"),
      installmentsPerYear: parseInt(mortgageForm.getValues().installments_per_year || "12"),
      loanProtectionType: mortgageForm.getValues().loan_protection_type,
      loanProtectionInsurance: parseFloat(mortgageForm.getValues().loan_protection_insurance || "0"),
      firstInstallmentDate: mortgageForm.getValues().first_installment_date || new Date()
    };
  };

  // The watch effect for form changes can now be optimized to only update when form values change, 
  // not to initialize values
  useEffect(() => {
    if (!mortgage?.property) return;
    
    const subscription = mortgageForm.watch((values) => {
      if (!values || !formIsReady) return;
      
      try {
        // Get the formatted values
        const formValues = getFormattedMortgageValues();
        
        // Get the property bonus directly from the database
        const bonus = getPropertyBonusFromCache(mortgage.property.id);
        
        const newInputs = {
          mortgageId: formValues.mortgageId,
          loanAmount: formValues.loanAmount,
          interestRate: formValues.interestRate,
          termYears: formValues.termYears,
          installmentsPerYear: formValues.installmentsPerYear,
          firstInstallmentDate: formValues.firstInstallmentDate,
          propertyInsurance: mortgage.property.property_insurance || 0,
          loanInsurance: formValues.loanProtectionInsurance
        };

        setScenarioInputs(newInputs);
      } catch (error) {
        console.error("Error updating scenario inputs:", error);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [mortgageForm, id, mortgage?.property, loanCalculator, supabase, calculatedLoanAmount, formIsReady]);

  const { data: scenarios, isLoading: isLoadingScenarios, error: scenariosError } = useScenarioCalculations(scenarioInputs)

  // Add debug logs for scenarios calculation
  useEffect(() => {
    if (scenarios && scenarios.regular) {
      // Handle default scenario logic
    }
  }, [scenarios, savedScenario]);

  // Effect to update default scenario values when scenarios are first calculated
  useEffect(() => {
    const setDefaultScenario = async () => {
      // Only run if we have mortgage data, scenarios calculated, and no saved scenario yet
      if (!id || !mortgage || !scenarios?.regular?.summary || isLoadingScenarios || savedScenario) {
        return;
      }
      
      // Get breakeven point directly from the summary
      const breakEvenPoint = scenarios.regular.summary.breakeven_point || null;
      
      // Update mortgage with regular scenario values
      const { error: updateError } = await supabase
        .from("mortgages")
        .update({
          saved_scenario: "regular",
          saved_scenario_total_interest_and_insurance: scenarios.regular.summary.total_interest_and_insurance || 0,
          saved_scenario_total_months: scenarios.regular.summary.total_months || 0,
          saved_scenario_monthly_payment: scenarios.regular.summary.monthly_payment || 0,
          saved_scenario_breakeven_point: breakEvenPoint
        })
        .eq("id", id);
        
        if (updateError) {
          console.error("Error setting default scenario:", updateError);
          return;
        }
        
        // Update state
        setSavedScenario("regular");
        localStorage.setItem(`savedScenario_${id}`, "regular");
      };
      
      setDefaultScenario();
    }, [id, mortgage, scenarios, isLoadingScenarios, savedScenario]);

  // Helper function to transform payment rows for ScenarioTable
  const mapPaymentForTable = useCallback((payment: any) => {
    if (!payment) return null;
    
    try {
      const paymentDate = new Date(payment.payment_date)
      const isDoublePaymentMonth = mortgage?.installments_per_year === 14 && 
        (paymentDate.getMonth() === 6 || paymentDate.getMonth() === 11)
      
      return {
        date: paymentDate,
        beginning_balance: payment.beginning_balance || 0,
        capital: payment.principal || payment.capital || 0,
        interest: payment.monthly_interest || payment.interest || 0,
        property_insurance: payment.property_insurance || 0,
        loan_insurance: payment.monthly_loan_insurance || payment.loan_insurance || 0,
        monthly_payment: payment.monthly_payment || 0,
        ending_balance: payment.ending_balance || 0,
        is_different_from_base: payment.is_different_from_base || false,
        is_double_payment: isDoublePaymentMonth
      };
    } catch (error) {
      console.error("Error mapping payment for table:", error);
      return null;
    }
  }, [mortgage?.installments_per_year]);

  // Update the onUpdateMortgage function to invalidate the bundle query after successful update
  const onUpdateMortgage = async (values: MortgageFormValues) => {
    // Set loading state to true at the beginning
    setIsSubmitting(true);
    
    try {
      // Different handling for new mortgage vs editing existing one
      if (isCreatingNew) {
        if (!selectedPropertyFromUrl) {
          throw new Error("No property selected")
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
        if (![12, 14].includes(installmentsPerYear)) {
          throw new Error("Invalid installments per year")
        }

        // Get loan amount from the form component calculation
        const loanAmount = selectedPropertyFromUrl.price_cost - downPayment;
        
        // Get the property bonus from cache or fetch if needed
        let cachedBonus = getPropertyBonusFromCache(selectedPropertyFromUrl.id);
        
        // Fetch if not in cache
        if (cachedBonus === 0 && !cachedPropertyData) {
          cachedBonus = await loanCalculator.getPropertyBonus(supabase, selectedPropertyFromUrl.id);
          // Update cache
          setCachedPropertyData({
            price_cost: selectedPropertyFromUrl.price_cost,
            bonus: cachedBonus,
            id: selectedPropertyFromUrl.id
          });
        }
        
        // Apply bonus to loan amount if applicable
        const finalLoanAmount = cachedBonus ? loanAmount - cachedBonus : loanAmount;

        // Validate loan amount
        if (finalLoanAmount <= 0) {
          throw new Error("Down payment cannot be greater than property cost")
        }

        // Handle date properly to preserve the day of month
        let firstInstallmentDate;
        if (values.first_installment_date) {
          firstInstallmentDate = normalizeDate(new Date(values.first_installment_date));
        }

        // Create a proper ISO date string preserving the exact date
        const dateString = firstInstallmentDate 
          ? `${firstInstallmentDate.getFullYear()}-${String(firstInstallmentDate.getMonth() + 1).padStart(2, '0')}-${String(firstInstallmentDate.getDate()).padStart(2, '0')}`
          : '';
        
        // Prepare mortgage data
        const mortgageData = {
          name: values.name || selectedPropertyFromUrl.name,
          property_id: selectedPropertyFromUrl.id,
          user_id: user?.id,
          down_payment: downPayment,
          interest_rate: interestRate,
          term_years: termYears,
          installments_per_year: installmentsPerYear,
          first_installment_date: dateString,
          loan_amount: finalLoanAmount,
          loan_protection_type: values.loan_protection_type,
          loan_protection_insurance: loanProtectionInsurance,
        }

        // Create new mortgage in Supabase
        const { data, error } = await supabase
          .from("mortgages")
          .insert({
            ...mortgageData,
            saved_scenario: "regular", // Set regular as default scenario
            saved_scenario_total_interest_and_insurance: 0, // Will be updated when scenario is calculated
            saved_scenario_total_months: termYears * 12,
            saved_scenario_monthly_payment: 0, // Will be updated when scenario is calculated
            saved_scenario_breakeven_point: null // Will be updated when scenario is calculated
          })
          .select()
          .single()

        if (error) throw error

        toast({
          title: t("ui.success", { ns: "global" }),
          description: t("messages.success_create", "Mortgage created successfully", { ns: "mortgages" }),
        })

        // Navigate to the edit page for the new mortgage
        if (data && data.id) {
          navigate(`/mortgages/${data.id}`)
        } else {
          navigate("/mortgages")
        }
      } else {
        // Original update logic for existing mortgage
        if (!mortgage) {
          throw new Error("No mortgage selected")
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
        if (![12, 14].includes(installmentsPerYear)) {
          throw new Error("Invalid installments per year")
        }

        // Get loan amount from the form component calculation
        const loanAmount = mortgage.property.price_cost - downPayment;
        
        // Get the property bonus from cache
        const cachedBonus = getPropertyBonusFromCache(mortgage.property.id);
        
        // Apply bonus to loan amount if applicable
        const finalLoanAmount = cachedBonus ? loanAmount - cachedBonus : loanAmount;

        // Validate loan amount
        if (finalLoanAmount <= 0) {
          throw new Error("Down payment cannot be greater than property cost")
        }

        // Handle date properly to preserve the day of month
        let firstInstallmentDate;
        if (values.first_installment_date) {
          firstInstallmentDate = normalizeDate(new Date(values.first_installment_date));
        }

        // Create a proper ISO date string preserving the exact date
        const dateString = firstInstallmentDate 
          ? `${firstInstallmentDate.getFullYear()}-${String(firstInstallmentDate.getMonth() + 1).padStart(2, '0')}-${String(firstInstallmentDate.getDate()).padStart(2, '0')}`
          : '';
        
        // Prepare mortgage data
        const mortgageData = {
          name: values.name,
          down_payment: downPayment,
          interest_rate: interestRate,
          term_years: termYears,
          installments_per_year: installmentsPerYear,
          first_installment_date: dateString,
          loan_amount: finalLoanAmount,
          loan_protection_type: values.loan_protection_type,
          loan_protection_insurance: loanProtectionInsurance,
        }

        // Get updated scenario values based on current saved scenario type
        let updatedScenarioData = {};
        
        try {
          // Get the current saved scenario type
          const currentScenarioType = savedScenario || "regular";
          
          // Prepare inputs for scenario calculation
          const calculationInput = {
            loan_amount: finalLoanAmount,
            interest_rate: interestRate,
            term_years: termYears,
            installments_per_year: installmentsPerYear,
            first_installment_date: firstInstallmentDate || new Date(),
            property_insurance: mortgage.property.property_insurance || 0,
            loan_insurance: loanProtectionInsurance || 0
          };
          
          // Fetch extra installments
          const { data: extraInstallments, error: extraInstallmentsError } = await supabase
            .from("extra_installments")
            .select("*")
            .eq("mortgage_id", id)
            .order("start_date", { ascending: true });
            
          if (extraInstallmentsError) throw extraInstallmentsError;
          
          // Fetch rate changes
          const { data: rateChanges, error: rateChangesError } = await supabase
            .from("new_rates")
            .select("*")
            .eq("mortgage_id", id)
            .order("effective_date", { ascending: true });
            
          if (rateChangesError) throw rateChangesError;
          
          // Import the ScenarioCalculator
          const { ScenarioCalculator } = await import("@/utils/calculations/mortgage/scenarioCalculator");
          
          // Calculate updated scenarios with the new parameters
          const updatedScenarios = ScenarioCalculator.calculateScenarios({
            ...calculationInput,
            extra_installments: extraInstallments || [],
            rate_changes: rateChanges || []
          });
          
          // Get the correct scenario data based on saved scenario type
          const scenarioData = updatedScenarios[currentScenarioType as keyof typeof updatedScenarios];
          
          if (scenarioData?.summary) {
            // Calculate breakeven point
            let breakEvenPoint = null;
            if (scenarioData.payments && scenarioData.payments.length > 0) {
              breakEvenPoint = scenarioData.summary.breakeven_point;
            }
            
            // Update the scenario data
            updatedScenarioData = {
              saved_scenario: currentScenarioType,
              saved_scenario_total_interest_and_insurance: scenarioData.summary.total_interest_and_insurance || 0,
              saved_scenario_total_months: scenarioData.summary.total_months || 0,
              saved_scenario_monthly_payment: scenarioData.summary.monthly_payment || 0,
              saved_scenario_breakeven_point: breakEvenPoint
            };
          }
        } catch (error) {
          console.error("Error calculating updated scenario values:", error);
          // Continue with the update even if scenario calculation fails
        }

        // Update mortgage in Supabase with both mortgage data and updated scenario values
        const { error: updateError } = await supabase
          .from("mortgages")
          .update({
            ...mortgageData,
            ...updatedScenarioData
          })
          .eq('id', id)

        if (updateError) throw updateError

        // Invalidate the scenarios query to refresh data
        queryClient.invalidateQueries({ queryKey: ["scenarios", id] });
        
        toast({
          title: t("ui.success", { ns: "global" }),
          description: t("messages.success_update", { ns: "mortgages" }),
        })
      }
      
      // After successful update, inside the try block after the update operation:
      queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] });
    } catch (error) {
      console.error("Error updating mortgage:", error)
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: error instanceof Error ? error.message : t("messages.error_update", { ns: "mortgages" })
      })
    } finally {
      // Always set loading state back to false when finished
      setIsSubmitting(false);
    }
  }

  // Update the handler for tab changes to avoid unnecessary re-renders
  const handleTabChange = (value: string) => {
    // Only update if the value is different
    if (value !== activeTab) {
      setActiveTab(value);
    }
  };

  // Effect to initialize property data from mortgage
  useEffect(() => {
    if (mortgage?.property && !cachedPropertyData) {
      // Initialize cache with property data when mortgage loads
      loanCalculator.getPropertyBonus(supabase, mortgage.property.id)
        .then(bonusAmount => {
          setCachedPropertyData({
            price_cost: mortgage.property.price_cost,
            bonus: bonusAmount,
            id: mortgage.property.id
          });
        })
        .catch(error => {
          console.error("Error initializing property data cache:", error);
        });
    }
  }, [mortgage?.property, cachedPropertyData, loanCalculator, supabase]);

  // Effect to initialize form with fetched data
  useEffect(() => {
    if (!isCreatingNew && mortgageBundle?.mortgage && mortgageBundle?.property) {
      const { mortgage, property } = mortgageBundle;
      
      // Update saved scenario if one exists in the database
      if (mortgage.saved_scenario) {
        // Update both state and localStorage
        setSavedScenario(mortgage.saved_scenario);
        localStorage.setItem(`savedScenario_${id}`, mortgage.saved_scenario);
      }
      
      // Create a properly typed property object
      const propertyWithDefaults = {
        ...property,
        is_first_home: property.is_first_home ?? false,
        is_sustainable: property.is_sustainable ?? false,
        property_insurance: property.property_insurance ?? null,
        property_insurance_type: (property.property_insurance_type as "auto" | "manual") ?? "auto",
        bonus: property.bonus ?? 0,
        description: property.description || ""
      } as Property;

      // Initialize form with fetched data
      mortgageForm.reset({
        name: mortgage.name || "",
        property_id: propertyWithDefaults.id,
        down_payment: mortgage.down_payment?.toString() || "",
        interest_rate: mortgage.interest_rate?.toString() || "",
        term_years: mortgage.term_years?.toString() || "",
        installments_per_year: mortgage.installments_per_year?.toString() || "",
        first_installment_date: parseDatabaseDate(mortgage.first_installment_date),
        loan_protection_type: mortgage.loan_protection_type as "none" | "custom" | "individual" | "joint",
        loan_protection_insurance: mortgage.loan_protection_insurance?.toString() || "",
      }, {
        keepDirty: false,
        keepValues: false,
      });
      
      // Set form as ready after a short delay to ensure form is properly populated
      setTimeout(() => {
        setFormIsReady(true);
      }, 100);

      // Immediately initialize scenario inputs with database values
      setScenarioInputs({
        mortgageId: id || "",
        loanAmount: mortgage.loan_amount || 0,
        interestRate: mortgage.interest_rate || 0,
        termYears: mortgage.term_years || 0,
        installmentsPerYear: mortgage.installments_per_year || 12,
        firstInstallmentDate: mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined,
        propertyInsurance: propertyWithDefaults.property_insurance || 0,
        loanInsurance: mortgage.loan_protection_insurance || 0
      });
    }
  }, [mortgageBundle, isCreatingNew, id, mortgageForm]);

  // Also add a handler to save scenario that uses the bundle
  const handleSaveScenario = async (scenarioType: string) => {
    try {
      // First, submit the current mortgage form to save any form changes
      await onUpdateMortgage(mortgageForm.getValues());
      
      // Save to state
      setSavedScenario(scenarioType);
      
      // Save to localStorage for persistence
      localStorage.setItem(`savedScenario_${id}`, scenarioType);
      
      // We need to explicitly check each scenario type
      let totalInterest = 0;
      let totalMonths = 0;
      let monthlyPayment = 0;
      let breakEvenPoint = null;
      
      // Extract data based on scenario type
      if (scenarioType === "regular" && scenarios?.regular?.summary) {
        totalInterest = scenarios.regular.summary.total_interest_and_insurance || 0;
        totalMonths = scenarios.regular.summary.total_months || 0;
        monthlyPayment = scenarios.regular.summary.monthly_payment || 0;
        breakEvenPoint = scenarios.regular.summary.breakeven_point || null;
      } 
      else if (scenarioType === "accelerated" && scenarios?.accelerated?.summary) {
        totalInterest = scenarios.accelerated.summary.total_interest_and_insurance || 0;
        totalMonths = scenarios.accelerated.summary.total_months || 0;
        monthlyPayment = scenarios.accelerated.summary.monthly_payment || 0;
        breakEvenPoint = scenarios.accelerated.summary.breakeven_point || null;
      }
      else if (scenarioType === "lower_payment" && scenarios?.lower_payment?.summary) {
        totalInterest = scenarios.lower_payment.summary.total_interest_and_insurance || 0;
        totalMonths = scenarios.lower_payment.summary.total_months || 0;
        monthlyPayment = scenarios.lower_payment.summary.monthly_payment || 0;
        breakEvenPoint = scenarios.lower_payment.summary.breakeven_point || null;
      }
      else if (scenarioType === "new_rate" && scenarios?.new_rate?.summary) {
        totalInterest = scenarios.new_rate.summary.total_interest_and_insurance || 0;
        totalMonths = scenarios.new_rate.summary.total_months || 0;
        monthlyPayment = scenarios.new_rate.summary.monthly_payment || 0;
        breakEvenPoint = scenarios.new_rate.summary.breakeven_point || null;
      }
      
      // Save to database if we have an ID
      if (id) {
        const { error } = await supabase
          .from("mortgages")
          .update({
            saved_scenario: scenarioType,
            saved_scenario_total_interest_and_insurance: totalInterest,
            saved_scenario_total_months: totalMonths, 
            saved_scenario_monthly_payment: monthlyPayment,
            saved_scenario_breakeven_point: breakEvenPoint
          })
          .eq("id", id);
          
        if (error) throw error;
        
        // Invalidate the bundle query to refresh data
        queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] });
      }
      
      // Show confirmation toast
      toast({
        title: t("ui.success", { ns: "global" }),
        description: t("messages.scenario_saved", "Scenario saved as default", { ns: "mortgages" }),
      });
    } catch (error) {
      console.error("Error saving scenario:", error);
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: t("messages.error_saving_scenario", "Error saving scenario", { ns: "mortgages" }),
      });
    }
  };

  // Replace the handleInstallmentsChange callback with a single version
  const handleInstallmentsChange = useCallback(async () => {
    // First invalidate the queries
    queryClient.invalidateQueries({
      queryKey: ["scenarios", id]
    });
    
    // Also invalidate the bundle query to refresh related data
    queryClient.invalidateQueries({
      queryKey: ["mortgage-bundle", id]
    });
  }, [queryClient, id]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t("ui.loading", { ns: "global" })}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Handle mortgage fetch errors
  if (mortgageError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-lg text-destructive">{t("messages.error_loading", "Error loading mortgage data", { ns: "mortgages" })}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {mortgageError instanceof Error ? mortgageError.message : t("messages.unknown_error", "An unknown error occurred", { ns: "global" })}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              {t("ui.reload", "Reload", { ns: "global" })}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!mortgage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-foreground">{t("messages.amortization_not_found", { ns: "mortgages" })}</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => navigate("/mortgages")}
            >
              {t("ui.back", { ns: "global" })}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
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
                {isCreatingNew ? (
                  <span className="text-foreground">
                    {t("ui.new", "New", { ns: "global" })} {t("sections.mortgage", "Mortgage", { ns: "dashboard" })}
                  </span>
                ) : (
                  <EditableHeading 
                    value={mortgage?.name || ""} 
                    onChange={async (newName) => {
                      try {
                        const { error } = await supabase
                          .from("mortgages")
                          .update({ name: newName })
                          .eq("id", id)

                        if (error) throw error
                        
                        // Invalidate the query to refresh mortgage data with the new name
                        queryClient.invalidateQueries({ queryKey: ["mortgage", id] })
                      } catch (error) {
                        console.error("Error updating name:", error)
                      }
                    }}
                    size="breadcrumb"
                    as="span"
                    className="text-foreground"
                  />
                )}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-col md:flex-row flex-1">
          {/* Left Container */}
          <div className="sm:w-full md:w-[30%] md:min-w-[340px] md:max-w-[520px] relative flex-shrink-0">
            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
            
              {isCreatingNew ? (
                selectedPropertyFromUrl ? (
                  <PropertyDisplay 
                    property={selectedPropertyFromUrl}
                    onPropertyUpdate={handlePropertyUpdate}
                  />
                ) : null
              ) : (
                mortgage ? (
                  <PropertyDisplay 
                    property={mortgage.property}
                    onPropertyUpdate={handlePropertyUpdate}
                  />
                ) : null
              )}
              <Separator className="" />
              <div className="p-1 md:p-2 lg:p-4">

              {((isCreatingNew && selectedPropertyFromUrl) || (!isCreatingNew && mortgage)) && (
                <Form {...mortgageForm}>
                  <MortgageDetailsForm
                    form={mortgageForm}
                    selectedProperty={isCreatingNew ? selectedPropertyFromUrl as Property : mortgage?.property}
                    onSubmit={onUpdateMortgage}
                    isSubmitting={isSubmitting}
                    submitLabel={isCreatingNew ? t("ui.create", "Create", { ns: "global" }) : t("ui.save", { ns: "global" })}
                    onLoanAmountChange={(amount: number) => {
                      setCalculatedLoanAmount(amount);
                    }}
                    propertyBonus={isCreatingNew ? 
                      getPropertyBonusFromCache(selectedPropertyFromUrl?.id || '') : 
                      getPropertyBonusFromCache(mortgage?.property.id || '')}
                  />
                </Form>
              )}
            </div>
          </div>

          {/* Right Container */}
          {!isCreatingNew && (
            <div className="w-screen sm:w-full overflow-hidden flex-1 pt-8 sm:p-0  ">
              {/* <h2 className="text-sm mb-6">{t("payment_scenarios_graphs")}</h2> */}
              {(!mortgage || !scenarios || isLoadingScenarios) ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
                  <div className="text-muted-foreground">{t("ui.loading", { ns: "global" })}</div>
                </div>
              ) : scenariosError ? (
                <div className="flex items-center justify-center h-64 flex-col">
                  <div className="text-destructive mb-2">{t("messages.error_calculating", "Error calculating scenarios", { ns: "mortgages" })}</div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["scenarios", id] })}
                  >
                    {t("ui.retry", "Retry", { ns: "global" })}
                  </Button>
                </div>
              ) : (
                <Tabs 
                  value={activeTab} 
                  className="w-full"
                  onValueChange={handleTabChange}
                >
                  <TabsList className="w-screen sm:w-full items-center justify-start flex inline-flex overflow-x-auto h-14 px-2 lg:px-3 xl:px-4 rounded-none">
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="regular">
                      {t("scenarios.regular.title", { ns: "mortgages" })}
                      {savedScenario === "regular" && (
                          <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="accelerated">
                      {t("scenarios.accelerated.title", { ns: "mortgages" })}
                      {savedScenario === "accelerated" && (
                        <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="lower_payment">
                      {t("scenarios.lower_payment.title", { ns: "mortgages" })}
                      {savedScenario === "lower_payment" && (
                        <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="new_rate">
                      {t("scenarios.new_rate.title", { ns: "mortgages" })}
                      {savedScenario === "new_rate" && (
                        <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="regular" className="m-0">
                    {scenarios.regular && (
                      <RegularPanelGraph
                        scenario={scenarios.regular}
                        currency={mortgage.property.currency}
                        installmentsPerYear={parseInt(mortgageForm.getValues().installments_per_year || "12")}
                        propertyCost={mortgage.property.price_cost}
                        isThisScenarioSaved={savedScenario === "regular"}
                        onSaveScenario={handleSaveScenario}
                        formValues={{
                          loan_amount: calculatedLoanAmount,
                          down_payment: getFormattedMortgageValues().downPayment,
                          interest_rate: getFormattedMortgageValues().interestRate,
                          term_years: getFormattedMortgageValues().termYears,
                          installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                          loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                          loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                          first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                        }}
                        extraInstallments={mortgageBundle?.extraInstallments || []}
                        newRates={mortgageBundle?.newRates || []}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="accelerated" className="m-0">
                    {scenarios.accelerated && (
                      <>
                        {mortgageBundle?.extraInstallments?.length > 0 && (
                          <AcceleratedPanelGraph
                            scenario={scenarios.accelerated}
                            regularScenario={scenarios.regular}
                            currency={mortgage.property.currency}
                            installmentsPerYear={getFormattedMortgageValues().installmentsPerYear}
                            propertyCost={mortgage.property.price_cost}
                            isThisScenarioSaved={savedScenario === "accelerated"}
                            onSaveScenario={handleSaveScenario}
                            formValues={{
                              loan_amount: calculatedLoanAmount,
                              down_payment: getFormattedMortgageValues().downPayment,
                              interest_rate: getFormattedMortgageValues().interestRate,
                              term_years: getFormattedMortgageValues().termYears,
                              installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                              loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                              loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                              first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                            }}
                            extraInstallments={mortgageBundle?.extraInstallments || []}
                          />
                        )}
                        <div className="mt-8">
                          <ExtraInstallmentsSection
                            mortgageId={getFormattedMortgageValues().mortgageId}
                            currency={mortgage.property.currency}
                            loanAmount={calculatedLoanAmount}
                            onInstallmentsChange={handleInstallmentsChange}
                            firstInstallmentDate={mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="lower_payment" className="m-0">
                    {scenarios.lower_payment && (
                      <>
                        {mortgageBundle?.extraInstallments?.length > 0 && (
                          <LowerPaymentPanelGraph
                            scenario={scenarios.lower_payment}
                            regularScenario={scenarios.regular}
                            currency={mortgage.property.currency}
                            installmentsPerYear={getFormattedMortgageValues().installmentsPerYear}
                            propertyCost={mortgage.property.price_cost}
                            isThisScenarioSaved={savedScenario === "lower_payment"}
                            onSaveScenario={handleSaveScenario}
                            formValues={{
                              loan_amount: calculatedLoanAmount,
                              down_payment: getFormattedMortgageValues().downPayment,
                              interest_rate: getFormattedMortgageValues().interestRate,
                              term_years: getFormattedMortgageValues().termYears,
                              installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                              loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                              loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                              first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                            }}
                            extraInstallments={mortgageBundle?.extraInstallments || []}
                          />
                        )}
                        <div className="mt-8">
                          <ExtraInstallmentsSection
                            mortgageId={getFormattedMortgageValues().mortgageId}
                            currency={mortgage.property.currency}
                            loanAmount={calculatedLoanAmount}
                            onInstallmentsChange={handleInstallmentsChange}
                            firstInstallmentDate={mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="new_rate" className="m-0">
                    {scenarios.new_rate && (
                      <>
                        {mortgageBundle?.newRates?.length > 0 && (
                          <NewRatePanelGraph
                            scenario={scenarios.new_rate}
                            regularScenario={scenarios.regular}
                            currency={mortgage.property.currency}
                            installmentsPerYear={getFormattedMortgageValues().installmentsPerYear}
                            propertyCost={mortgage.property.price_cost}
                            isThisScenarioSaved={savedScenario === "new_rate"}
                            onSaveScenario={handleSaveScenario}
                            formValues={{
                              loan_amount: calculatedLoanAmount,
                              down_payment: getFormattedMortgageValues().downPayment,
                              interest_rate: getFormattedMortgageValues().interestRate,
                              term_years: getFormattedMortgageValues().termYears,
                              installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                              loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                              loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                              first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                            }}
                            newRates={mortgageBundle?.newRates || []}
                          />
                        )}
                        <div className="mt-8">
                          <NewRateForm
                            mortgageId={getFormattedMortgageValues().mortgageId}
                            onSuccess={() => {
                              queryClient.invalidateQueries({
                                queryKey: ["scenarios", id]
                              });
                              
                              // Also invalidate the bundle query to refresh related data
                              queryClient.invalidateQueries({
                                queryKey: ["mortgage-bundle", id]
                              });
                            }}
                            className="space-y-4"
                            firstInstallmentDate={mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 