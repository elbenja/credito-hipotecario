import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMortgageCount } from "@/hooks/mortgages/useCount";
import { useMortgageDraftStore } from "@/store/mortgage/store";
import { useCreateMortgage } from "@/hooks/mortgages/useCreate";

/**
 * Types for mortgage capture service
 */

export interface MortgageCapture {
  mortgageId: string;
  successCallback?: () => void;
  stayOnPage?: boolean;
}

export interface CurrentScenarioCapture {
  mortgageId: string;
  scenarioType: string;
  scenarioSummary: {
    total_interest_and_insurance: number;
    total_months: number;
    monthly_payment: number;
    breakeven_point?: number | null;
  };
  successCallback?: () => void;
  stayOnPage?: boolean;
}

/**
 * Mortgage capture service
 * Creates new mortgages using the useCreateMortgage hook
 */
export const useMortgageCapture = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t: tGlobal } = useTranslation('global');
  const { t: tMortgages } = useTranslation('mortgages');
  const { incrementMortgageCount } = useMortgageCount();
  const mortgageDraft = useMortgageDraftStore((state) => state.mortgageDraft);
  const createMortgage = useCreateMortgage();

  /**
   * Captures a mortgage with all its dependencies
   */
  const captureMortgage = async ({ mortgageId, successCallback, stayOnPage = false }: MortgageCapture) => {
    try {
      // Check if user has reached their mortgage limit
      // const limitReached = await checkMortgageLimits();

      // 1. Get original mortgage data with the most up-to-date values
      const { data: originalMortgage, error: mortgageError } = await supabase
        .from("mortgages")
        .select(`
          *,
          property:properties (
            id,
            name,
            price_cost,
            currency,
            is_first_home,
            is_sustainable,
            property_insurance
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

      // 2. Create duplicate mortgage using the hook
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

      // Use the hook to create the mortgage
      const newMortgage = await createMortgage.mutateAsync(duplicatedMortgage);

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
        description: stayOnPage 
          ? tMortgages('messages.scenario_captured', "Scenario captured: {{name}}", { name: mortgageName })
          : tMortgages('messages.scenario_captured_redirect', "Scenario captured: {{name}}. Redirecting to mortgages list...", { 
            name: mortgageName 
          }),
      });

      // 6. Call the success callback if provided
      if (successCallback) {
        successCallback();
      }

      // If not staying on the page, navigate to the mortgages list
      if (!stayOnPage) {
        navigate("/mortgages");
      }
      incrementMortgageCount();

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

  /**
   * Captures the current scenario with form values without modifying the original mortgage
   */
  const captureCurrentScenario = async ({ 
    mortgageId, 
    scenarioType, 
    scenarioSummary,
    successCallback, 
    stayOnPage = false 
  }: CurrentScenarioCapture) => {
    try {
      if (!mortgageId) {
        console.error("No mortgage ID provided to captureCurrentScenario");
        toast({
          variant: "destructive",
          title: tGlobal('ui.error'),
          description: tMortgages('messages.error_invalid_id', "Invalid mortgage ID"),
        });
        return null;
      }

      if (!mortgageDraft) {
        console.error("No mortgage draft data available");
        toast({
          variant: "destructive",
          title: tGlobal('ui.error'),
          description: tMortgages('messages.error_no_draft_data', "No draft data available"),
        });
        return null;
      }
      
      // Check if user has reached their mortgage limit
      // const limitReached = await checkMortgageLimits();

      // 1. Get original mortgage data just for the property and user info
      const { data: originalMortgage, error: mortgageError } = await supabase
        .from("mortgages")
        .select(`
          name,
          property_id,
          user_id,
          property:properties (
            id,
            name,
            price_cost,
            currency,
            is_first_home,
            is_sustainable,
            property_insurance
          )
        `)
        .eq("id", mortgageId)
        .single();

      if (mortgageError || !originalMortgage) {
        console.error("Error fetching mortgage data:", mortgageError);
        toast({
          variant: "destructive",
          title: tGlobal('ui.error'),
          description: tMortgages('messages.error_mortgage_not_found', "Error: Mortgage not found"),
        });
        return null;
      }
      
      // Create name for the captured mortgage
      const mortgageName = `${originalMortgage.name} (${scenarioType})`;

      // Format the date for database storage
      const formattedDate = mortgageDraft.first_installment_date.toISOString().split('T')[0];

      // 2. Create new mortgage with current values from the store using the hook
      const newMortgageData = {
        name: mortgageName,
        property_id: originalMortgage.property_id,
        user_id: originalMortgage.user_id,
        // Use current values from the store
        loan_amount: mortgageDraft.loan_amount || 0,
        down_payment: parseFloat(mortgageDraft.down_payment) || 0,
        interest_rate: parseFloat(mortgageDraft.interest_rate) || 0,
        term_years: parseInt(mortgageDraft.term_years) || 0,
        installments_per_year: parseInt(mortgageDraft.installments_per_year) || 12,
        loan_protection_type: mortgageDraft.loan_protection_type,
        loan_protection_insurance: parseFloat(mortgageDraft.loan_protection_insurance) || 0,
        first_installment_date: formattedDate,
        // Set the current scenario as the saved scenario
        saved_scenario: scenarioType,
        saved_scenario_total_interest_and_insurance: scenarioSummary.total_interest_and_insurance,
        saved_scenario_total_months: scenarioSummary.total_months,
        saved_scenario_monthly_payment: scenarioSummary.monthly_payment,
        saved_scenario_breakeven_point: scenarioSummary.breakeven_point !== null ? scenarioSummary.breakeven_point : undefined
      };

      // Use the hook to create the mortgage (this handles toasts, query invalidation, etc.)
      const createdMortgage = await createMortgage.mutateAsync(newMortgageData);

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
          mortgage_id: createdMortgage.id,
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
          mortgage_id: createdMortgage.id,
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
        description: stayOnPage 
          ? tMortgages('messages.scenario_captured', "Scenario captured: {{name}}", { name: mortgageName })
          : tMortgages('messages.scenario_captured_redirect', "Scenario captured: {{name}}. Redirecting to mortgages list...", { 
            name: mortgageName 
          }),
      });

      // 6. Call the success callback if provided
      if (successCallback) {
        successCallback();
      }

      // If not staying on the page, navigate to the mortgages list
      if (!stayOnPage) {
        navigate("/mortgages");
      }
      incrementMortgageCount();

      // Return the new mortgage data
      return createdMortgage;
    } catch (error) {
      console.error("Error capturing current scenario:", error);
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
    captureCurrentScenario,
  };
}; 