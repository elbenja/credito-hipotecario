import { LoanCalculator } from "@/utils/calculations/mortgage/loan";
import { fetchPropertyWithBonus } from "@/services/propertyService";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context";

export async function updateDependentMortgages(propertyId: string): Promise<void> {
    // 1) load the property with bonus
    const { user } = useAuth()
    const userId = user?.id

    if (!userId) throw new Error("User ID is required")

    const property = await fetchPropertyWithBonus(userId, propertyId);
  
    // 2) instantiate LoanCalculator, set rate
    // 3) query all mortgages for this property
    // 4) loop & recalc loan, scenarios, and persist
    // 5) invalidate cache & return

  // New function to update all dependent mortgages when a property changes

    try {
      console.log(`Updating dependent mortgages for property ${property.id}`);
      
      // Create an instance of the LoanCalculator
      // const loanCalculator = new LoanCalculator();
      
      // Set the exchange rate if available
      // if (exchangeRate) {
      //   loanCalculator.setExchangeRate(exchangeRate);
      // }
      
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
        const bonus = property.bonus;
        
        // Calculate new loan amount
        // const newLoanAmount = loanCalculator.calculateLoanAmountSync(
        //   propertyForCalculator,
        //   mortgage.down_payment,
        //   bonus
        // );
        
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
        // const scenarioResults = LoanCalculator.calculateResultsSync(propertyForCalculator, baseValues, bonus);
        
        // // If there are extra installments or rate changes, we need to calculate those too
        // const { data: extraInstallments } = await supabase
        //   .from("extra_installments")
        //   .select("*")
        //   .eq("mortgage_id", mortgage.id);
          
        // const { data: rateChanges } = await supabase
        //   .from("new_rates")
        //   .select("*")
        //   .eq("mortgage_id", mortgage.id);
        
        // We need to dynamically import the scenario calculator if there are extra installments or rate changes
        let updatedScenarioData = {};
        
        try {
          // if ((extraInstallments && extraInstallments.length > 0) || (rateChanges && rateChanges.length > 0)) {
          //   // For complex scenarios with extra installments or rate changes,
          //   // we'll just update the loan amount and keep the existing scenario values
          //   // but adjusted proportionally to the new loan amount
            
          //   // Get the proportion between new and old loan amount
          //   const oldLoanAmount = (mortgage as any).loan_amount || scenarioResults.loan_amount;
          //   const proportion = newLoanAmount / oldLoanAmount;
            
          //   // Get the original scenario data
          //   const { data: originalMortgage, error: originalError } = await supabase
          //     .from("mortgages")
          //     .select("saved_scenario_total_interest_and_insurance, saved_scenario_total_months, saved_scenario_monthly_payment, saved_scenario_breakeven_point")
          //     .eq("id", mortgage.id)
          //     .single();
              
          //   if (!originalError && originalMortgage) {
          //     // Proportionally adjust the scenario values
          //     updatedScenarioData = {
          //       saved_scenario_total_interest_and_insurance: originalMortgage.saved_scenario_total_interest_and_insurance * proportion,
          //       saved_scenario_monthly_payment: originalMortgage.saved_scenario_monthly_payment * proportion,
          //       // Keep the same months and break-even point
          //       saved_scenario_total_months: originalMortgage.saved_scenario_total_months,
          //       saved_scenario_breakeven_point: originalMortgage.saved_scenario_breakeven_point
          //     };
          //   }
            
          //   console.log(`Applied proportional adjustment (${proportion.toFixed(2)}) for mortgage ${mortgage.id} with complex scenarios`);
          // } else {
          //   // Use the regular scenario results from LoanCalculator
          //   // Calculate breakeven point
          //   let breakEvenPoint = await calculateBreakEvenPoint(scenarioResults.payment_schedule);
            
          //   updatedScenarioData = {
          //     saved_scenario_total_interest_and_insurance: scenarioResults.total_interest_and_insurance || 0,
          //     saved_scenario_total_months: scenarioResults.total_months || 0,
          //     saved_scenario_monthly_payment: scenarioResults.monthly_payment || 0,
          //     saved_scenario_breakeven_point: breakEvenPoint
          //   };
          // }
        } catch (error) {
          console.error("Error calculating scenario data:", error);
          // Continue with just updating the loan amount
        }
        
        // Step E: Update the mortgage with new values
        const { error: updateError } = await supabase
          .from("mortgages")
          .update({ 
            loan_amount: 0,
            ...updatedScenarioData
          })
          .eq('id', mortgage.id);
          
        if (updateError) {
          console.error(`Error updating mortgage ${mortgage.id}:`, updateError);
          continue;
        }
        
        console.log(`Successfully updated mortgage ${mortgage.id}`);
      }

      // Get QueryClient from the context
      const queryClient = useQueryClient()
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
  