import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Types for mortgage capture service
 */

export interface MortgageCapture {
  mortgageId: string;
  successCallback?: () => void;
}

/**
 * Mortgage capture service
 * Creates a duplicate of a mortgage with all its dependencies
 */
export const useMortgageCapture = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t: tGlobal } = useTranslation('global');
  const { t: tMortgages } = useTranslation('mortgages');

  /**
   * Checks if the user has reached their mortgage limit
   */
  const checkMortgageLimits = async (): Promise<boolean> => {
    try {
      // Get the user's profile information
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return true; // Limit reached if no user
      }

      // Get current subscription info
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .single();
        
      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which just means they're on the free plan
        console.error("Error checking subscription:", subscriptionError);
      }
        
      // Get plan limits
      const planId = subscriptionData?.plan_id || 'free';
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("mortgage_limit")
        .eq("id", planId)
        .single();
        
      if (planError) {
        console.error("Error checking plan limits:", planError);
        return false; // Default to allowing creation in case of errors
      }
      
      // Default limit for free plan
      const mortgageLimit = planData?.mortgage_limit || 3;
      
      // Get current count directly from database for accuracy
      const { count, error: countError } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        console.error("Error counting mortgages:", countError);
        return false;
      }
      
      // True if limit reached
      return (count || 0) >= mortgageLimit;
    } catch (err) {
      console.error("Error checking mortgage limits:", err);
      return false; // Default to allowing creation in case of errors
    }
  };

  /**
   * Captures a mortgage with all its dependencies
   */
  const captureMortgage = async ({ mortgageId, successCallback }: MortgageCapture) => {
    try {
      // Check if user has reached their mortgage limit
      const limitReached = await checkMortgageLimits();
      
      if (limitReached) {
        toast({
          variant: "destructive",
          title: tGlobal('ui.error'),
          description: tMortgages('messages.plan_limit_reached', "You have reached your plan limit for mortgages"),
        });
        return null;
      }

      // 1. Get original mortgage data
      const { data: originalMortgage, error: mortgageError } = await supabase
        .from("mortgages")
        .select(`
          *,
          property:properties (
            id,
            name
          )
        `)
        .eq("id", mortgageId)
        .single();

      if (mortgageError || !originalMortgage) {
        throw new Error(mortgageError?.message || "Mortgage not found");
      }

      // Get the current saved scenario type
      const scenarioType = originalMortgage.saved_scenario || "regular";
      
      // Create name for the duplicated mortgage
      const mortgageName = `${originalMortgage.name} (${scenarioType})`;

      // 2. Create duplicate mortgage
      const duplicatedMortgage = {
        name: mortgageName,
        property_id: originalMortgage.property_id,
        user_id: originalMortgage.user_id,
        loan_amount: originalMortgage.loan_amount,
        down_payment: originalMortgage.down_payment,
        interest_rate: originalMortgage.interest_rate,
        term_years: originalMortgage.term_years,
        installments_per_year: originalMortgage.installments_per_year,
        loan_protection_type: originalMortgage.loan_protection_type,
        loan_protection_insurance: originalMortgage.loan_protection_insurance,
        first_installment_date: originalMortgage.first_installment_date,
        saved_scenario: originalMortgage.saved_scenario || "regular",
        saved_scenario_total_interest_and_insurance: originalMortgage.saved_scenario_total_interest_and_insurance,
        saved_scenario_total_months: originalMortgage.saved_scenario_total_months,
        saved_scenario_monthly_payment: originalMortgage.saved_scenario_monthly_payment,
        saved_scenario_breakeven_point: originalMortgage.saved_scenario_breakeven_point
      };

      // Insert into mortgages (using amortizations table since that's the actual table)
      const { data: newMortgage, error: createError } = await supabase
        .from("amortizations")
        .insert(duplicatedMortgage)
        .select()
        .single();

      if (createError || !newMortgage) {
        throw new Error(createError?.message || "Failed to create mortgage");
      }

      // 3. Copy extra installments
      const { data: extraInstallments, error: extraInstallmentsError } = await supabase
        .from("extra_installments")
        .select("*")
        .eq("mortgage_id", mortgageId);

      if (extraInstallmentsError) {
        console.error("Error fetching extra installments:", extraInstallmentsError);
      } else if (extraInstallments && extraInstallments.length > 0) {
        // Prepare installments for the new mortgage
        const newInstallments = extraInstallments.map(installment => ({
          mortgage_id: newMortgage.id,
          amount: installment.amount,
          frequency: installment.frequency,
          start_date: installment.start_date
        }));

        // Insert all extra installments
        const { error: insertError } = await supabase
          .from("extra_installments")
          .insert(newInstallments);

        if (insertError) {
          console.error("Error copying extra installments:", insertError);
        }
      }

      // 4. Copy new rates
      const { data: newRates, error: newRatesError } = await supabase
        .from("new_rates")
        .select("*")
        .eq("mortgage_id", mortgageId);

      if (newRatesError) {
        console.error("Error fetching new rates:", newRatesError);
      } else if (newRates && newRates.length > 0) {
        // Prepare new rates for the new mortgage
        const duplicatedRates = newRates.map(rate => ({
          mortgage_id: newMortgage.id,
          effective_date: rate.effective_date,
          new_interest_rate: rate.new_interest_rate,
          new_term_years: rate.new_term_years
        }));

        // Insert all new rates
        const { error: insertRatesError } = await supabase
          .from("new_rates")
          .insert(duplicatedRates);

        if (insertRatesError) {
          console.error("Error copying new rates:", insertRatesError);
        }
      }

      // 5. Show success toast with the name including scenario
      toast({
        title: tGlobal('ui.success'),
        description: tMortgages('messages.scenario_captured', "Scenario captured: {{name}}", { 
          name: mortgageName 
        }),
      });

      // 6. Call the success callback if provided (e.g., refresh mortgage list)
      if (successCallback) {
        successCallback();
      }

      // Return the new mortgage data
      return newMortgage;
    } catch (error) {
      console.error("Error capturing mortgage:", error);
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tMortgages('messages.error_capturing_scenario', "Error capturing scenario"),
      });
      return null;
    }
  };

  return {
    captureMortgage,
    checkMortgageLimits
  };
}; 