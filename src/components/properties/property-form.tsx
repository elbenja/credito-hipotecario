import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { PropertyDetails } from "./property-details"
import { MonthlyCosts } from "./monthly-costs"
import { BonusSection } from "./bonus-section"
import { Property, BonusRule } from "@/types/property"
import { useTranslation } from "react-i18next"
import { useMemo, useState, useEffect, useRef } from "react"

import { LoanCalculator } from "@/utils/calculations/mortgage/loan"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useQueryClient } from "@tanstack/react-query"
import { useAddProperty } from "@/hooks/properties"
// Define the schema creator function that takes the translation function

export const createPropertyFormSchema = (t: any) => z.object({
  name: z.string().min(1, {
    message: t('property_form.validation.property_name_required', 'Property name is required', { ns: 'components' })
  }),
  description: z.string().optional(),
  price_cost: z.string().min(1, {
    message: t('property_form.validation.price_required', 'Property price is required', { ns: 'components' })
  }),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  property_insurance_type: z.enum(["auto", "manual"]).default("auto"),
  is_sustainable: z.boolean().default(false),
  is_first_home: z.boolean().default(false),
})

// Define a type that can be used by child components
export type PropertyFormSchema = z.infer<ReturnType<typeof createPropertyFormSchema>>

type PropertyFormProps = {
  onSuccess: () => void
  onClose: () => void
  selectedProperty: Property | null
}

export function PropertyForm({ onSuccess, onClose, selectedProperty }: PropertyFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { t: tGlobal } = useTranslation('global')
  const { t: tProperties } = useTranslation('properties')
  const { t: tComponents } = useTranslation('components')
  const { data: exchangeRate } = useExchangeRate()
  const queryClient = useQueryClient()
  const addProperty = useAddProperty()
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);

  // Create the schema with translations
  const propertyFormSchema = useMemo(() => 
    createPropertyFormSchema(tComponents), 
    [tComponents]
  )

  const form = useForm<z.infer<typeof propertyFormSchema>>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: selectedProperty?.name || "",
      description: selectedProperty?.description || "",
      price_cost: selectedProperty?.price_cost.toString() || "",
      currency: (selectedProperty?.currency as "PEN" | "USD") || "PEN",
      property_insurance: selectedProperty?.property_insurance?.toString() || "",
      property_insurance_type: selectedProperty?.property_insurance_type || "auto",
      is_sustainable: selectedProperty?.is_sustainable || false,
      is_first_home: selectedProperty?.is_first_home || false,
    },
  })


  async function onSubmit(values: z.infer<typeof propertyFormSchema>) {
    try {
      if (!user) throw new Error(tGlobal('messages.no_user_found', 'User not found', { ns: 'properties' }))

      const propertyData = {
        name: values.name,
        description: values.description,
        price_cost: parseFloat(values.price_cost),
        currency: values.currency,
        property_insurance: values.property_insurance ? parseFloat(values.property_insurance) : null,
        property_insurance_type: values.property_insurance_type,
        is_sustainable: values.is_sustainable,
        is_first_home: values.is_first_home,
        user_id: user.id,
      }

      let updatedProperty: Property | null = null;

      if (selectedProperty) {
        const { data, error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq('id', selectedProperty.id)
          .select()
          .single()

        if (error) throw error
        
        // Store the updated property data for dependent mortgage updates
        updatedProperty = data as Property

        toast({
          title: tGlobal('ui.success'),
          description: tProperties('messages.property_updated'),
        })
        
        // Check if any critical property fields changed
        const criticalFieldsChanged = 
          selectedProperty.price_cost !== propertyData.price_cost ||
          selectedProperty.currency !== propertyData.currency ||
          selectedProperty.property_insurance !== propertyData.property_insurance ||
          selectedProperty.is_first_home !== propertyData.is_first_home ||
          selectedProperty.is_sustainable !== propertyData.is_sustainable;
        
        // Update dependent mortgages if critical fields changed
        if (criticalFieldsChanged && updatedProperty) {
          await updateDependentMortgages(updatedProperty);
        }
      } else {
        // Optimistically add new property
        addProperty.mutate(propertyData, {
          onSuccess: (newProperty) => {
            console.log("PROPERTY FORM: Property created successfully");
            toast({
              title: tGlobal('ui.success'),
              description: tProperties('messages.property_added'),
            });
            onSuccess();
            onClose();
            form.reset();
          },
          onError: (err) => {
            console.error("PROPERTY FORM: Error creating property:", err);
            toast({
              variant: "destructive",
              title: tGlobal('ui.error'),
              description: tProperties('messages.error_saving'),
            });
          },
        });
        return;
      }
      
      onSuccess()
      onClose()
      form.reset()
    } catch (error) {
      console.error("PROPERTY FORM: Error during submission:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tProperties('messages.error_saving'),
      })
    }
  }

  // New function to update all dependent mortgages when a property changes
  async function updateDependentMortgages(property: Property) {
    try {
      console.log(`Updating dependent mortgages for property ${property.id}`);
      
      // Create an instance of the LoanCalculator
      const loanCalculator = new LoanCalculator();
      
      // Set the exchange rate if available
      if (exchangeRate) {
        loanCalculator.setExchangeRate(exchangeRate);
      }
      
      // Step A: Fetch all mortgages that depend on this property
      const { data: mortgages, error: mortgagesError } = await supabase
        .from("mortgages")
        .select("id, down_payment, interest_rate, term_years, installments_per_year, first_installment_date, loan_protection_type, loan_protection_insurance, saved_scenario, loan_amount")
        .eq("property_id", property.id);
        
      if (mortgagesError) throw mortgagesError;
      
      if (!mortgages || mortgages.length === 0) {
        console.log("No dependent mortgages found");
        return;
      }
      
      console.log(`Found ${mortgages.length} dependent mortgages to update`);
      
      // Create a compatible property object for LoanCalculator
      const propertyForCalculator = {
        id: property.id,
        name: property.name,
        price_cost: property.price_cost,
        currency: property.currency,
        property_insurance: property.property_insurance || 0,
        property_insurance_type: property.property_insurance_type,
        is_first_home: property.is_first_home,
        is_sustainable: property.is_sustainable
      };
      
      // Step D: Process each mortgage
      for (const mortgage of mortgages) {
        console.log(`Processing mortgage ${mortgage.id}`);
        
        // Get the property bonus
        const bonus = await loanCalculator.getPropertyBonus(supabase, property.id);
        
        // Calculate new loan amount
        const newLoanAmount = loanCalculator.calculateLoanAmountSync(
          propertyForCalculator,
          mortgage.down_payment,
          bonus
        );
        
        // Prepare base values for scenario calculation
        const baseValues = {
          property_id: property.id,
          down_payment: mortgage.down_payment,
          down_payment_percentage: (mortgage.down_payment / property.price_cost) * 100,
          interest_rate: mortgage.interest_rate,
          term_years: mortgage.term_years,
          installments_per_year: mortgage.installments_per_year,
          first_installment_date: mortgage.first_installment_date,
          loan_protection_type: mortgage.loan_protection_type,
          loan_protection_insurance: mortgage.loan_protection_insurance
        };
        
        // Calculate new scenario results
        const scenarioResults = loanCalculator.calculateResultsSync(propertyForCalculator, baseValues, bonus);
        
        // If there are extra installments or rate changes, we need to calculate those too
        const { data: extraInstallments } = await supabase
          .from("extra_installments")
          .select("*")
          .eq("mortgage_id", mortgage.id);
          
        const { data: rateChanges } = await supabase
          .from("new_rates")
          .select("*")
          .eq("mortgage_id", mortgage.id);
        
        // We need to dynamically import the scenario calculator if there are extra installments or rate changes
        let updatedScenarioData = {};
        
        try {
          if ((extraInstallments && extraInstallments.length > 0) || (rateChanges && rateChanges.length > 0)) {
            // For complex scenarios with extra installments or rate changes,
            // we'll just update the loan amount and keep the existing scenario values
            // but adjusted proportionally to the new loan amount
            
            // Get the proportion between new and old loan amount
            const oldLoanAmount = (mortgage as any).loan_amount || scenarioResults.loan_amount;
            const proportion = newLoanAmount / oldLoanAmount;
            
            // Get the original scenario data
            const { data: originalMortgage, error: originalError } = await supabase
              .from("mortgages")
              .select("saved_scenario_total_interest_and_insurance, saved_scenario_total_months, saved_scenario_monthly_payment, saved_scenario_breakeven_point")
              .eq("id", mortgage.id)
              .single();
              
            if (!originalError && originalMortgage) {
              // Proportionally adjust the scenario values
              updatedScenarioData = {
                saved_scenario_total_interest_and_insurance: originalMortgage.saved_scenario_total_interest_and_insurance * proportion,
                saved_scenario_monthly_payment: originalMortgage.saved_scenario_monthly_payment * proportion,
                // Keep the same months and break-even point
                saved_scenario_total_months: originalMortgage.saved_scenario_total_months,
                saved_scenario_breakeven_point: originalMortgage.saved_scenario_breakeven_point
              };
            }
            
            console.log(`Applied proportional adjustment (${proportion.toFixed(2)}) for mortgage ${mortgage.id} with complex scenarios`);
          } else {
            // Use the regular scenario results from LoanCalculator
            // Calculate breakeven point
            let breakEvenPoint = await calculateBreakEvenPoint(scenarioResults.payment_schedule);
            
            updatedScenarioData = {
              saved_scenario_total_interest_and_insurance: scenarioResults.total_interest_and_insurance || 0,
              saved_scenario_total_months: scenarioResults.total_months || 0,
              saved_scenario_monthly_payment: scenarioResults.monthly_payment || 0,
              saved_scenario_breakeven_point: breakEvenPoint
            };
          }
        } catch (error) {
          console.error("Error calculating scenario data:", error);
          // Continue with just updating the loan amount
        }
        
        // Step E: Update the mortgage with new values
        const { error: updateError } = await supabase
          .from("mortgages")
          .update({ 
            loan_amount: newLoanAmount,
            ...updatedScenarioData
          })
          .eq('id', mortgage.id);
          
        if (updateError) {
          console.error(`Error updating mortgage ${mortgage.id}:`, updateError);
          continue;
        }
        
        console.log(`Successfully updated mortgage ${mortgage.id}`);
      }
      
      // Invalidate queries to refresh UI data
      queryClient.invalidateQueries({ queryKey: ["mortgages"] });
      
      toast({
        title: tGlobal('ui.success'),
        description: tProperties('messages.dependent_mortgages_updated', `${mortgages.length} dependent mortgages were updated`),
      });
      
    } catch (error) {
      console.error("Error updating dependent mortgages:", error);
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tProperties('messages.error_updating_mortgages', 'Error updating dependent mortgages'),
      });
    }
  }
  
  // Helper function to calculate break-even point
  async function calculateBreakEvenPoint(payments: any[]) {
    if (!payments || payments.length === 0) return null;
    
    // Look for the point where principal becomes greater than interest+insurance
    for (let i = 0; i < payments.length - 1; i++) {
      const current = payments[i];
      const next = payments[i + 1];
      
      const currentPrincipal = current.principal || current.capital || 0;
      const currentInterest = (current.monthly_interest || current.interest || 0) + 
                           (current.property_insurance || 0) + 
                           (current.monthly_loan_insurance || current.loan_insurance || 0);
      
      const nextPrincipal = next.principal || next.capital || 0;
      const nextInterest = (next.monthly_interest || next.interest || 0) + 
                         (next.property_insurance || 0) + 
                         (next.monthly_loan_insurance || next.loan_insurance || 0);
      
      // Found the crossover point
      if (currentPrincipal <= currentInterest && nextPrincipal > nextInterest) {
        // Return year value with one decimal
        return (i + 1) / 12;
      }
      
      // Alternative check for when principal already exceeds interest
      if (i === 0 && currentPrincipal >= currentInterest) {
        return 0;
      }
    }
    
    return null;
  }

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Show the form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <PropertyDetails form={form} isNewProperty={!selectedProperty} />
        <MonthlyCosts form={form} />
        <BonusSection form={form} />
        
        <Button type="submit" className="w-full">
          {selectedProperty ? tGlobal('ui.update') : tGlobal('ui.create')}
        </Button>
      </form>
    </Form>
  );
}
