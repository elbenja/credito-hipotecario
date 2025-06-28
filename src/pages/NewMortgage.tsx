import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
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

/// new hooks and types
import { PropertyDisplay } from "@/components/properties/PropertyDisplay"
import { PropertySelect } from "@/components/properties/PropertySelect"
import type { Property , PropertyWithBonus } from "@/types/property"

import { MortgageDetailsForm } from "@/components/mortgages/mortgage-details-form"
import { fetchPropertyWithBonus } from "@/services/propertyService";
import { useToast } from "@/components/ui/use-toast"

import { normalizeDate } from "@/utils/utils"

import { ScenarioCalculator } from "@/utils/calculations/mortgage/scenarioCalculator"
import { defaultValues, MortgageFormValues } from "@/components/mortgages/schema"
import { useAddMortgage } from "@/hooks/mortgages"
import { convertTermToMonths } from "@/utils/term-conversion"

import { useMortgageDraft } from "@/hooks/useMortgageDraft"
import { useMortgageDraftStore } from "@/store/mortgage/store"
import { usePropertyBonus } from "@/hooks/usePropertyBonus"
import { useForm } from "react-hook-form"
// import { useExchangeRate } from "@/hooks/use-exchange-rate"

export default function NewMortgage() {
  const addMortgage = useAddMortgage()

  const { t } = useTranslation(['mortgages', 'dashboard', 'global'])
  const { t: tMortgages } = useTranslation('mortgages')
  
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  
  // Extract propertyId from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const propertyIdFromUrl = queryParams.get('propertyId')
  
  // Reset draft store on component mount
  // This ensures we always start with default values
  const { resetDraft: resetStore} = useMortgageDraftStore()
  const { updateDraft } = useMortgageDraftStore()
  const { calculateBonus } = usePropertyBonus();
  const hardResetDraft = useMortgageDraftStore((state) => state.hardResetDraft);
  
  const { reset, setValue } = useForm<MortgageFormValues>({
    defaultValues: defaultValues
  });

  // const setExchangeRate = useMortgageDraftStore((s) => s.setExchangeRate);
  // Now use the mortgage draft hook for form handling
  const {
    form,
    mortgageDraft,
    resetDraft,
    isLoading: isLoadingDraft,
  } = useMortgageDraft(null) // Pass null since this is a new mortgage
  
  // State for property data when coming from property-list
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithBonus | undefined | null>(null)
  
  // Fetch property details if needed
  const fetchPropertyIfNeeded = async (propertyId: string) => {
    if (!user?.id) {
      console.error("No user ID available");
      return;
    }
    try {
      const property = await fetchPropertyWithBonus(user.id, propertyId);
      const defaultName = `${property.name} ${t("amortization.mortgage_suffix", { ns: "mortgages" })}`;
      // Sync the form name with the store name, form need to be change before zustand or it resets the calcmount
      form.setValue("name", defaultName, { shouldValidate: true });

      setSelectedProperty(property);
      updateDraft({
        property_id: property.id,
        property,
        name: defaultName,
      });
      

    } catch (error) {
      console.error("Error fetching property:", error);
    }
  };


  // Add at the top of the component before any other effects
useEffect(() => {
  // Clear ALL state on initial mount
  resetStore();
  hardResetDraft();
  setSelectedProperty(null);
  form.reset(defaultValues);
  
  // Only now check for propertyId
  if (propertyIdFromUrl) {
    fetchPropertyIfNeeded(propertyIdFromUrl);
    // Explicitly set the property_id in the form to pass validation
    form.setValue("property_id", propertyIdFromUrl, { shouldValidate: true });
  }
}, []); // Empty dependency array = only run once on mount

// function DebugMortgageDraft() {
//   useEffect(() => {
//     // Subscribe with a single callback function
//     const unsub = useMortgageDraftStore.subscribe((state) => {
//       // Extract the properties we want to log
//       const property = state.mortgageDraft?.property;
//       const property_id = state.mortgageDraft?.property_id;
      
//       // console.log(
//       //   "%c[MORTGAGE DRAFT STORE] property:",
//       //   "color:teal;font-weight:bold",
//       //   property,
//       //   "property_id:",
//       //   property_id
//       // );
//     });
    
//     return unsub;
//   }, []);

//   return null;
// }


  // State to track if form is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Property is now coming from either the selectedProperty state or the mortgageDraft
  // second part is pulling old data from the draft
  const property = selectedProperty //|| mortgageDraft?.property
  
  // console.log("const property:", property)

  // Function to handle property selection from PropertySelect
  const handlePropertyChange = (updated: PropertyWithBonus | null) => {

  
    setSelectedProperty(updated)
    // console.log("beforeupdated draft", updated)

    if (updated) {
      // Update the form property ID
      const bonusValue = calculateBonus(updated);

      // 2) merge it into a new enriched object
      const enriched: PropertyWithBonus = {
        ...updated,
        bonus: bonusValue,
      };
      // 3) update your local state & draft store
     
      updateDraft({ 
        property: enriched, 
        property_id: enriched.id 
      });
      setSelectedProperty(enriched);
      

      // form.setValue("property_id", updated.id, { shouldValidate: true })
      
      // Update the form name if empty
      if (!form.getValues("name")) {
        const defaultName = `${updated.name} ${t("amortization.mortgage_suffix", { ns: "mortgages" })}`
        form.setValue("name", defaultName, { shouldValidate: true })
      }
      

    } else {
      // form.setValue("property_id", "", { shouldValidate: true })
    }
  }

  // Form submission handler
  const handleFormSubmit = async (values: any) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    
    try {
      if (!property) {
        toast({
          variant: "destructive",
          title: t("ui.error", { ns: "global" }),
          description: t("messages.please_complete_all_fields", { ns: "mortgages" }),
        })
        setIsSubmitting(false)
        return
      }
      

      // Parse form values
      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, "") || "0")
      const interestRate = parseFloat(values.interest_rate)
      
      // Use term conversion utilities for precise handling
      const termYearsInput = parseFloat(values.term_years)
      const termMonths = values.term_months || convertTermToMonths(termYearsInput)
      const termYears = Math.round(termMonths / 12) // For backward compatibility
      
      const installmentsPerYear = parseInt(values.installments_per_year)
      const loanProtectionInsurance = parseFloat(values.loan_protection_insurance)
      const calculatedLoanAmount = mortgageDraft?.loan_amount || 0

      // Ensure down payment is a valid number, with a fallback to 0
      const validDownPayment = isNaN(downPayment) ? 0 : Math.max(0, downPayment);
      
      if (isNaN(interestRate) || interestRate <= 0) {
        throw new Error("Invalid interest rate")
      }
      if (isNaN(termYears) || termYears <= 0) {
        throw new Error("Invalid term years")
      }
      if (![12, 14].includes(installmentsPerYear)) {
        throw new Error("Invalid installments per year")
      }
      
      // Handle date
      const firstInstallmentDate = values.first_installment_date ? 
        normalizeDate(new Date(values.first_installment_date)) : 
        normalizeDate(new Date())
      
      // Format date for database
      const dateString = `${firstInstallmentDate.getFullYear()}-${String(firstInstallmentDate.getMonth() + 1).padStart(2, '0')}-${String(firstInstallmentDate.getDate()).padStart(2, '0')}`
      

      
      // Calculate scenario values using ScenarioCalculator
      const scenarios = ScenarioCalculator.calculateScenarios({
        loan_amount: calculatedLoanAmount,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        first_installment_date: firstInstallmentDate,
        property_insurance: property.property_insurance || 0,
        loan_insurance: loanProtectionInsurance
      })
      
      // Get the regular scenario
      const regularScenario = scenarios.regular
      
      // Create mortgage object
      console.log("property.id", property.id)
      const mortgageData = {
        name: values.name,
        property_id: property.id,
        user_id: user?.id,
        loan_amount: calculatedLoanAmount,
        down_payment: validDownPayment,
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
      }
      

       // Save mortgage to database (optimistically via React Query)
       addMortgage.mutate(mortgageData, {
        onSuccess(newRow) {
          toast({
            title: t("ui.success", { ns: "global" }),
            description: t("messages.amortization_created", { ns: "mortgages" }),
          })
          resetDraft()
          resetStore()
          navigate(`/mortgages/${newRow.id}`)
        },
        onError(err) {
          console.error(err)
          toast({
            variant: "destructive",
            title: t("ui.error", { ns: "global" }),
            description: err.message,
          })
        },
      })
      

      
    } catch (error) {
      console.error("Error creating mortgage:", error)
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: error instanceof Error ? error.message : t("messages.error_creating_amortization", { ns: "mortgages" }),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // If loading the draft, show a loading spinner
  if (isLoadingDraft) {
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
                <BreadcrumbPage>
                  {form.watch("name") || t("amortization.new", { ns: "mortgages" })}
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
              <div className="p-0">

                {property ? (
                  <>
                  
              
                    <PropertyDisplay 
                      property={property}
                      onPropertyUpdate={(updatedProperty) => {
                        // Update our local property state when property is updated
                        handlePropertyChange(updatedProperty)
                      }}
                    />
                  </>
                ) : (
                  <div className="p-1 md:p-2 lg:p-4 space-y-6"> 
                    {/* <PropertySelect 
                      form={form} 
                      onPropertyChange={handlePropertyChange}
                    /> */}
                    <PropertySelect 
                    form={form}
                    // initialValue={null} // Explicitly set no initial value
                    onPropertyChange={handlePropertyChange}
                  />
                  </div>
                )}

<Separator />       
                <div className="p-1 md:p-2 lg:p-4 space-y-6">


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

                {property && (
                  <>
                   
                    
                    <MortgageDetailsForm
                      form={form}
                      selectedProperty={property}
                      onSubmit={handleFormSubmit}
                      isSubmitting={isSubmitting}
                      submitLabel={t("ui.create", { ns: "global" })}
                      propertyBonus={property.bonus || 0}
                      onLoanAmountChange={(amount) => {
                        // This is handled in our hook but kept for compatibility
                      }}
                    />
                  </>
                )}
                </div>
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
