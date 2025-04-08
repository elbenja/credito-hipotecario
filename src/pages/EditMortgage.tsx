import { useNavigate, useParams, Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EditableHeading } from "@/components/ui/editable-heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PropertyDisplay, type Property } from "@/components/mortgages/property-select"
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
import { AmortizationDetailsForm } from "@/components/amortizations/amortization-details-form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { amortizationFormSchema, type AmortizationFormValues } from "@/components/amortizations/schema"
import { useToast } from "@/components/ui/use-toast"
import { createLocalDate } from "@/lib/utils"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import { 
  RegularPanelGraph,
  AcceleratedPanelGraph,
  LowerPaymentPanelGraph,
  NewRatePanelGraph 
} from '@/components/amortizations/scenario-panels/graph-panels'
import { ExtraInstallmentsSection } from '@/components/mortgages/extra-installments-section'
import { NewRateForm } from '@/components/mortgages/new-rate-form'
import { useMemo, useCallback, useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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
  const [selectedPropertyFromUrl, setSelectedPropertyFromUrl] = useState<Property | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(!id)
  // Add state to track if extra installments exist
  const [hasExtraInstallments, setHasExtraInstallments] = useState(false)

  const mortgageForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
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

  // Handle property update callback
  const handlePropertyUpdate = useCallback((updatedProperty: Property) => {
    // Invalidate the query to refetch the data
    queryClient.invalidateQueries({ queryKey: ["amortization", id] })
  }, [queryClient, id])

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
          setSelectedPropertyFromUrl(data as unknown as Property)
          
          // Update form with property information
          mortgageForm.setValue("property_id", data.id, { shouldValidate: true })
          
          // Set a default name for the mortgage based on the property name
          const defaultMortgageName = `${data.name} Mortgage`
          mortgageForm.setValue("name", defaultMortgageName, { shouldValidate: true })
        }
      } catch (error) {
        console.error("Error fetching property:", error)
      }
    }
    
    if (isCreatingNew) {
      fetchPropertyFromUrl()
    }
  }, [propertyIdFromUrl, user, mortgageForm, isCreatingNew, tMortgages])

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

  const { data: mortgage, isLoading } = useQuery({
    queryKey: ["amortization", id],
    queryFn: async () => {
      if (!user || !id) return null

      const { data, error } = await supabase
        .from("amortizations")
        .select(`
          id, 
          name,
          down_payment,
          interest_rate,
          term_years,
          installments_per_year,
          first_installment_date,
          loan_protection_type,
          loan_protection_insurance,
          loan_amount,
          property:properties!inner (
            id,
            name,
            description,
            currency,
            price_cost,
            is_first_home,
            is_sustainable,
            property_insurance,
            property_insurance_type
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      if (!data) return null

      const property = data.property as unknown as Property
      
      // Ensure all required fields have default values
      const propertyWithDefaults: Property = {
        ...property,
        is_first_home: property.is_first_home ?? false,
        is_sustainable: property.is_sustainable ?? false,
        property_insurance: property.property_insurance ?? null,
        property_insurance_type: (property.property_insurance_type as "auto" | "manual") ?? "auto"
      }

      // Initialize form with fetched data
      mortgageForm.reset({
        name: data.name || "",
        property_id: propertyWithDefaults.id,
        down_payment: data.down_payment?.toString() || "",
        interest_rate: data.interest_rate?.toString() || "",
        term_years: data.term_years?.toString() || "",
        installments_per_year: data.installments_per_year?.toString() || "",
        first_installment_date: createLocalDate(data.first_installment_date),
        loan_protection_type: data.loan_protection_type as "none" | "custom" | "individual" | "joint",
        loan_protection_insurance: data.loan_protection_insurance?.toString() || "",
      })

      return {
        ...data,
        property: propertyWithDefaults
      }
    },
    enabled: !!user && !!id
  })

  // Update scenario inputs when mortgage data changes
  useEffect(() => {
    if (mortgage) {
      setScenarioInputs({
        mortgageId: id || "",
        loanAmount: mortgage.loan_amount || 0,
        interestRate: mortgage.interest_rate || 0,
        termYears: mortgage.term_years || 0,
        installmentsPerYear: mortgage.installments_per_year || 12,
        firstInstallmentDate: mortgage.first_installment_date ? new Date(mortgage.first_installment_date) : undefined,
        propertyInsurance: mortgage.property?.property_insurance || 0,
        loanInsurance: mortgage.loan_protection_insurance || 0
      });
    }
  }, [
    id, 
    mortgage
  ]);

  // Add form value watching effect with proper dependency array
  useEffect(() => {
    if (!mortgage?.property) return;
    
    const subscription = mortgageForm.watch((values) => {
      if (!values) return;
      
      // Only call this function when we have meaningful changes
      const downPayment = parseFloat(values.down_payment?.replace(/[^0-9.]/g, "") || "0");
      const loanAmount = mortgage.property.price_cost - downPayment;
      const interestRate = parseFloat(values.interest_rate || "0");
      const termYears = parseInt(values.term_years || "0");
      const installmentsPerYear = parseInt(values.installments_per_year || "12");
      
      // Handle loan protection insurance based on type
      let loanInsurance = 0;
      switch (values.loan_protection_type) {
        case "individual":
          loanInsurance = 0.028;
          break;
        case "joint":
          loanInsurance = 0.052;
          break;
        case "custom":
          loanInsurance = parseFloat(values.loan_protection_insurance || "0");
          break;
        case "none":
          loanInsurance = 0;
          break;
      }

      // Handle date properly to preserve the day of month
      let firstInstallmentDate;
      if (values.first_installment_date) {
        const tempDate = new Date(values.first_installment_date);
        firstInstallmentDate = new Date(
          tempDate.getFullYear(),
          tempDate.getMonth(),
          tempDate.getDate(),
          12, 0, 0, 0
        );
      }

      setScenarioInputs({
        mortgageId: id || "",
        loanAmount,
        interestRate,
        termYears,
        installmentsPerYear,
        firstInstallmentDate,
        propertyInsurance: mortgage.property.property_insurance || 0,
        loanInsurance
      });
    });
    
    return () => subscription.unsubscribe();
  }, [mortgageForm, id, mortgage?.property]);

  const { data: scenarios, isLoading: isLoadingScenarios } = useScenarioCalculations(scenarioInputs)

  // Helper function to transform payment rows for ScenarioTable
  const mapPaymentForTable = useCallback((payment: any) => {
    if (!payment) return null;
    
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
  }, [mortgage?.installments_per_year]);

  const onUpdateMortgage = async (values: AmortizationFormValues) => {
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

        // Calculate loan amount
        const loanAmount = selectedPropertyFromUrl.price_cost - downPayment

        // Validate loan amount
        if (loanAmount <= 0) {
          throw new Error("Down payment cannot be greater than property cost")
        }

        // Create a proper ISO date string preserving the exact date
        const inputDate = new Date(values.first_installment_date);
        const dateString = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`;
        
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
          loan_amount: loanAmount,
          loan_protection_type: values.loan_protection_type,
          loan_protection_insurance: loanProtectionInsurance,
        }

        // Create new mortgage in Supabase
        const { data, error } = await supabase
          .from("amortizations")
          .insert(mortgageData)
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

        // Calculate loan amount
        const loanAmount = mortgage.property.price_cost - downPayment

        // Validate loan amount
        if (loanAmount <= 0) {
          throw new Error("Down payment cannot be greater than property cost")
        }

        // Create a proper ISO date string preserving the exact date
        const inputDate = new Date(values.first_installment_date);
        const dateString = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`;
        
        // Prepare mortgage data
        const mortgageData = {
          name: values.name,
          down_payment: downPayment,
          interest_rate: interestRate,
          term_years: termYears,
          installments_per_year: installmentsPerYear,
          first_installment_date: dateString,
          loan_amount: loanAmount,
          loan_protection_type: values.loan_protection_type,
          loan_protection_insurance: loanProtectionInsurance,
        }

        // Update mortgage in Supabase
        const { error: updateError } = await supabase
          .from("amortizations")
          .update(mortgageData)
          .eq('id', id)

        if (updateError) throw updateError

        toast({
          title: t("ui.success", { ns: "global" }),
          description: t("messages.success_update", { ns: "mortgages" }),
        })
      }
    } catch (error) {
      console.error("Error updating mortgage:", error)
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: error instanceof Error ? error.message : t("messages.error_update", { ns: "mortgages" })
      })
    }
  }

  const [activeTab, setActiveTab] = useState("regular")

  // Add effect to fetch and update extra installments state
  useEffect(() => {
    const fetchExtraInstallments = async () => {
      if (!id || !user) return
      
      try {
        const { data, error } = await supabase
          .from("extra_installments")
          .select("id")
          .eq("mortgage_id", id)
          .limit(1)
          
        if (error) throw error
        
        // Update state based on whether any installments exist
        setHasExtraInstallments(data.length > 0)
      } catch (error) {
        console.error("Error fetching extra installments:", error)
      }
    }
    
    if (!isCreatingNew) {
      fetchExtraInstallments()
    }
  }, [id, user, isCreatingNew])

  // Add state to track if new rates exist
  const [hasNewRates, setHasNewRates] = useState(false)
  
  // Add effect to fetch and update new rates state
  useEffect(() => {
    const fetchNewRates = async () => {
      if (!id || !user) return
      
      try {
        const { data, error } = await supabase
          .from("new_rates")
          .select("id")
          .eq("mortgage_id", id)
          .limit(1)
          
        if (error) throw error
        
        // Update state based on whether any new rates exist
        setHasNewRates(data.length > 0)
      } catch (error) {
        console.error("Error fetching new rates:", error)
      }
    }
    
    if (!isCreatingNew) {
      fetchNewRates()
    }
  }, [id, user, isCreatingNew])

  // Update the onInstallmentsChange callback to also update the hasExtraInstallments state
  const handleInstallmentsChange = useCallback(async () => {
    // First invalidate the queries
    queryClient.invalidateQueries({
      queryKey: ["scenarios", id]
    })
    
    // Then check if any installments still exist
    if (!id || !user) return
    
    try {
      const { data, error } = await supabase
        .from("extra_installments")
        .select("id")
        .eq("mortgage_id", id)
        .limit(1)
        
      if (error) throw error
      
      // Update state based on whether any installments exist
      setHasExtraInstallments(data.length > 0)
    } catch (error) {
      console.error("Error checking extra installments:", error)
    }
  }, [queryClient, id, user])

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
                          .from("amortizations")
                          .update({ name: newName })
                          .eq("id", id)

                        if (error) throw error
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
          <div className="sm:w-full md:w-[30%] md:min-w-[400px] md:max-w-[540px] relative flex-shrink-0">
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
              <Separator className="my-2" />
              <div className="p-1 md:p-2 lg:p-4">

              {((isCreatingNew && selectedPropertyFromUrl) || (!isCreatingNew && mortgage)) && (
                <Form {...mortgageForm}>
                  <AmortizationDetailsForm
                    form={mortgageForm}
                    selectedProperty={isCreatingNew ? selectedPropertyFromUrl as Property : mortgage?.property}
                    onSubmit={onUpdateMortgage}
                    submitLabel={isCreatingNew ? t("ui.create", "Create", { ns: "global" }) : t("ui.update", { ns: "global" })}
                  />
                </Form>
              )}
            </div>
          </div>

          {/* Right Container */}
          {!isCreatingNew && (
            <div className="w-screen sm:w-full overflow-hidden flex-1 pt-6 sm:pt-1 p-1 md:p-2 lg:p-4">
              {/* <h2 className="text-sm mb-6">{t("payment_scenarios_graphs")}</h2> */}
              {(!mortgage || !scenarios || isLoadingScenarios) ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
                  <div className="text-muted-foreground">{t("ui.loading", { ns: "global" })}</div>
                </div>
              ) : (
                <Tabs 
                  defaultValue="regular" 
                  className="w-full"
                  onValueChange={setActiveTab}
                >
                  <TabsList className="w-screen sm:w-auto flex inline-flex overflow-x-auto">
                    <TabsTrigger className="flex-shrink-0 px-5" value="regular">{t("scenarios.regular.title", { ns: "mortgages" })}</TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-5" value="accelerated">{t("scenarios.accelerated.title", { ns: "mortgages" })}</TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-5" value="lower_payment">{t("scenarios.lower_payment.title", { ns: "mortgages" })}</TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-5" value="new_rate">{t("scenarios.new_rate.title", { ns: "mortgages" })}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="regular">
                    {scenarios.regular && (
                      <RegularPanelGraph
                        scenario={scenarios.regular}
                        currency={mortgage.property.currency}
                        installmentsPerYear={mortgage.installments_per_year}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="accelerated">
                    {scenarios.accelerated && (
                      <>
                        {hasExtraInstallments ? (
                          <AcceleratedPanelGraph
                            scenario={scenarios.accelerated}
                            regularScenario={scenarios.regular}
                            currency={mortgage.property.currency}
                            installmentsPerYear={mortgage.installments_per_year}
                          />
                        ) : null}
                        <div className="mt-8">
                          <ExtraInstallmentsSection
                            mortgageId={id || ""}
                            currency={mortgage.property.currency}
                            loanAmount={mortgage.loan_amount}
                            onInstallmentsChange={handleInstallmentsChange}
                            firstInstallmentDate={mortgage.first_installment_date ? new Date(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="lower_payment">
                    {scenarios.lower_payment && (
                      <>
                        {hasExtraInstallments ? (
                          <LowerPaymentPanelGraph
                            scenario={scenarios.lower_payment}
                            regularScenario={scenarios.regular}
                            currency={mortgage.property.currency}
                            installmentsPerYear={mortgage.installments_per_year}
                          />
                        ) : null}
                        <div className="mt-8">
                          <ExtraInstallmentsSection
                            mortgageId={id || ""}
                            currency={mortgage.property.currency}
                            loanAmount={mortgage.loan_amount}
                            onInstallmentsChange={handleInstallmentsChange}
                            firstInstallmentDate={mortgage.first_installment_date ? new Date(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="new_rate">
                    {scenarios.new_rate && (
                      <>
                        {hasNewRates ? (
                          <NewRatePanelGraph
                            scenario={scenarios.new_rate}
                            regularScenario={scenarios.regular}
                            currency={mortgage.property.currency}
                            installmentsPerYear={mortgage.installments_per_year}
                          />
                        ) : null}
                        <div className="mt-8">
                          <NewRateForm
                            mortgageId={id || ""}
                            onSuccess={() => {
                              queryClient.invalidateQueries({
                                queryKey: ["scenarios", id]
                              });
                              
                              // Check if any new rates exist after adding/deleting
                              const checkNewRates = async () => {
                                try {
                                  const { data, error } = await supabase
                                    .from("new_rates")
                                    .select("id")
                                    .eq("mortgage_id", id)
                                    .limit(1);
                                    
                                  if (error) throw error;
                                  
                                  // Update state based on whether any new rates exist
                                  setHasNewRates(data.length > 0);
                                } catch (error) {
                                  console.error("Error checking new rates:", error);
                                }
                              };
                              
                              checkNewRates();
                            }}
                            className="space-y-4"
                            firstInstallmentDate={mortgage.first_installment_date ? new Date(mortgage.first_installment_date) : undefined}
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