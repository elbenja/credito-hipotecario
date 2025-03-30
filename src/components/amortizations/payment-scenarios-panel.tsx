import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import { RegularScenarioPanel } from "./scenario-panels/regular-scenario-panel"
import { AcceleratedScenarioPanel } from "./scenario-panels/accelerated-scenario-panel"
import { LowerPaymentScenarioPanel } from "./scenario-panels/lower-payment-scenario-panel"
import { NewRateScenarioPanel } from "./scenario-panels/new-rate-scenario-panel"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"

interface PaymentScenariosProps {
  amortizationId: string
  currency: "USD" | "PEN"
}

export function PaymentScenariosPanel({
  amortizationId,
  currency
}: PaymentScenariosProps) {
  const { t } = useTranslation()

  // Fetch amortization data
  const { data: amortization, isLoading: isLoadingAmortization } = useQuery({
    queryKey: ["amortization", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("amortizations")
        .select("*")
        .eq("id", amortizationId)
        .single()

      if (error) throw error
      return data
    }
  })

  // Return early if amortization data is not loaded
  if (isLoadingAmortization || !amortization) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">{t('payment_scenarios.title')}</h2>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t('payment_scenarios.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Use the scenario calculations hook with amortization data
  const { data: scenarios, isLoading: isLoadingScenarios } = useScenarioCalculations({
    amortizationId,
    loanAmount: amortization.loan_amount,
    interestRate: amortization.interest_rate,
    termYears: amortization.term_years,
    installmentsPerYear: amortization.installments_per_year,
    firstInstallmentDate: amortization.first_installment_date ? new Date(amortization.first_installment_date) : undefined,
    propertyInsurance: amortization.property_insurance,
    loanInsurance: amortization.loan_insurance
  })

  // Helper function to transform payment rows for ScenarioTable
  const mapPaymentForTable = (payment: any) => {
    const paymentDate = new Date(payment.payment_date);
    const isDoublePaymentMonth = payment.is_double_payment;
    
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
  }

  // Loading state
  if (isLoadingAmortization || isLoadingScenarios || !scenarios) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t("loading_scenarios")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <h2 className="text-lg font-semibold mb-4">{t("Payment Scenarios and Amortizations")}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RegularScenarioPanel
          scenario={scenarios.regular}
          currency={currency}
          installmentsPerYear={amortization.installments_per_year}
          mapPaymentForTable={mapPaymentForTable}
        />

        <AcceleratedScenarioPanel
          scenario={scenarios.accelerated}
          regularScenario={scenarios.regular}
          currency={currency}
          installmentsPerYear={amortization.installments_per_year}
          mapPaymentForTable={mapPaymentForTable}
        />

        <LowerPaymentScenarioPanel
          scenario={scenarios.lower_payment}
          regularScenario={scenarios.regular}
          currency={currency}
          installmentsPerYear={amortization.installments_per_year}
          mapPaymentForTable={mapPaymentForTable}
        />

        <NewRateScenarioPanel
          scenario={scenarios.new_rate}
          regularScenario={scenarios.regular}
          currency={currency}
          installmentsPerYear={amortization.installments_per_year}
          mapPaymentForTable={mapPaymentForTable}
        />
      </div>
    </div>
  )
}
