import { supabase } from "@/integrations/supabase/client"
import { addMonths, startOfMonth } from "date-fns"
import type { Database } from "@/types/supabase"

export type ScenarioType = Database['public']['Enums']['scenario_type']

type ScenarioSummary = Database['public']['Tables']['scenario_summaries']['Row']
type ScenarioPayment = Database['public']['Tables']['scenario_payments']['Row']
type ExtraInstallment = Database['public']['Tables']['extra_installments']['Row']
type RateChange = Database['public']['Tables']['rate_changes']['Row']

interface AmortizationInput {
  id: string
  loan_amount: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  first_installment_date: string
  property_insurance: number
  loan_insurance: number
}

interface PaymentRow {
  payment_date: Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
}

interface ScenarioSummaryResult {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

export class ScenarioCalculator {
  private calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    totalPayments: number
  ): number {
    const monthlyRate = annualRate / 12 / 100
    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1)
    )
  }

  private calculateExtraPaymentsImpact(
    extraInstallments: ExtraInstallment[],
    firstInstallmentDate: Date,
    totalMonths: number
  ): number {
    let totalExtraPayments = 0

    extraInstallments.forEach(installment => {
      const startDate = new Date(installment.start_date)
      
      if (installment.frequency === 'one-time') {
        if (startDate >= firstInstallmentDate) {
          totalExtraPayments += installment.amount
        }
      } else { // monthly
        const monthsSinceStart = Math.floor(
          (startDate.getTime() - firstInstallmentDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
        )
        const remainingMonths = totalMonths - monthsSinceStart
        totalExtraPayments += installment.amount * Math.max(0, remainingMonths)
      }
    })

    return totalExtraPayments
  }

  private calculateRegularPayments(
    amortization: AmortizationInput,
    firstInstallmentDate: Date
  ): PaymentRow[] {
    const totalMonths = amortization.term_years * 12
    const monthlyPayment = this.calculateMonthlyPayment(
      amortization.loan_amount,
      amortization.interest_rate,
      totalMonths
    )

    const payments: PaymentRow[] = []
    let remainingBalance = amortization.loan_amount

    for (let month = 0; month < totalMonths; month++) {
      const monthlyInterest = remainingBalance * (amortization.interest_rate / 12 / 100)
      const monthlyPrincipal = monthlyPayment - monthlyInterest
      
      payments.push({
        payment_date: addMonths(firstInstallmentDate, month),
        capital: monthlyPrincipal,
        interest: monthlyInterest,
        property_insurance: amortization.property_insurance,
        loan_insurance: amortization.loan_insurance,
        monthly_payment: monthlyPayment + amortization.property_insurance + amortization.loan_insurance,
        is_different_from_base: false
      })

      remainingBalance -= monthlyPrincipal
    }

    return payments
  }

  async calculateScenario(
    amortization: AmortizationInput,
    extraInstallments: ExtraInstallment[],
    rateChanges: RateChange[],
    scenarioType: ScenarioType
  ): Promise<{
    summary: ScenarioSummaryResult
    payments: PaymentRow[]
  }> {
    const totalMonths = amortization.term_years * 12
    const firstInstallmentDate = startOfMonth(new Date(amortization.first_installment_date))
    
    let payments: PaymentRow[] = []

    switch (scenarioType) {
      case 'regular': {
        payments = this.calculateRegularPayments(amortization, firstInstallmentDate)
        break
      }
      case 'accelerated': {
        const totalExtraPayments = this.calculateExtraPaymentsImpact(
          extraInstallments,
          firstInstallmentDate,
          totalMonths
        )
        const adjustedLoanAmount = amortization.loan_amount - totalExtraPayments
        const baseMonthlyPayment = this.calculateMonthlyPayment(
          amortization.loan_amount,
          amortization.interest_rate,
          totalMonths
        )

        // Keep the same monthly payment but reduce the number of months
        const adjustedTotalMonths = Math.ceil(
          Math.log(
            baseMonthlyPayment /
              (baseMonthlyPayment - (adjustedLoanAmount * amortization.interest_rate / 12 / 100))
          ) / Math.log(1 + amortization.interest_rate / 12 / 100)
        )

        let remainingBalance = adjustedLoanAmount
        for (let month = 0; month < adjustedTotalMonths; month++) {
          const monthlyInterest = remainingBalance * (amortization.interest_rate / 12 / 100)
          const monthlyPrincipal = baseMonthlyPayment - monthlyInterest
          
          payments.push({
            payment_date: addMonths(firstInstallmentDate, month),
            capital: monthlyPrincipal,
            interest: monthlyInterest,
            property_insurance: amortization.property_insurance,
            loan_insurance: amortization.loan_insurance,
            monthly_payment: baseMonthlyPayment + amortization.property_insurance + amortization.loan_insurance,
            is_different_from_base: true
          })

          remainingBalance -= monthlyPrincipal
        }
        break
      }
      case 'lower_payment': {
        const totalExtraPayments = this.calculateExtraPaymentsImpact(
          extraInstallments,
          firstInstallmentDate,
          totalMonths
        )
        const adjustedLoanAmount = amortization.loan_amount - totalExtraPayments
        const adjustedMonthlyPayment = this.calculateMonthlyPayment(
          adjustedLoanAmount,
          amortization.interest_rate,
          totalMonths
        )

        let remainingBalance = adjustedLoanAmount
        for (let month = 0; month < totalMonths; month++) {
          const monthlyInterest = remainingBalance * (amortization.interest_rate / 12 / 100)
          const monthlyPrincipal = adjustedMonthlyPayment - monthlyInterest
          
          payments.push({
            payment_date: addMonths(firstInstallmentDate, month),
            capital: monthlyPrincipal,
            interest: monthlyInterest,
            property_insurance: amortization.property_insurance,
            loan_insurance: amortization.loan_insurance,
            monthly_payment: adjustedMonthlyPayment + amortization.property_insurance + amortization.loan_insurance,
            is_different_from_base: true
          })

          remainingBalance -= monthlyPrincipal
        }
        break
      }
      case 'new_rate': {
        let currentRate = amortization.interest_rate
        let remainingBalance = amortization.loan_amount
        let currentMonthlyPayment = this.calculateMonthlyPayment(
          amortization.loan_amount,
          currentRate,
          totalMonths
        )

        for (let month = 0; month < totalMonths; month++) {
          const currentDate = addMonths(firstInstallmentDate, month)
          
          // Check if there's a rate change for this month
          const rateChange = rateChanges.find(change => 
            new Date(change.effective_date).getTime() === currentDate.getTime()
          )

          if (rateChange) {
            currentRate = rateChange.new_interest_rate
            const remainingPayments = totalMonths - month
            currentMonthlyPayment = this.calculateMonthlyPayment(
              remainingBalance,
              currentRate,
              remainingPayments
            )
          }

          const monthlyInterest = remainingBalance * (currentRate / 12 / 100)
          const monthlyPrincipal = currentMonthlyPayment - monthlyInterest
          
          payments.push({
            payment_date: currentDate,
            capital: monthlyPrincipal,
            interest: monthlyInterest,
            property_insurance: amortization.property_insurance,
            loan_insurance: amortization.loan_insurance,
            monthly_payment: currentMonthlyPayment + amortization.property_insurance + amortization.loan_insurance,
            is_different_from_base: true
          })

          remainingBalance -= monthlyPrincipal
        }
        break
      }
    }

    // Calculate summary
    const totalInterest = payments.reduce((sum, payment) => sum + payment.interest, 0)
    const totalInsurance = (amortization.property_insurance + amortization.loan_insurance) * payments.length

    return {
      summary: {
        total_interest_and_insurance: totalInterest + totalInsurance,
        total_months: payments.length,
        monthly_payment: payments[0].monthly_payment
      },
      payments
    }
  }

  private async cleanupExistingScenarios(amortizationId: string): Promise<void> {
    try {
      // First get all scenario summaries for this amortization
      const { data: summaries, error: fetchError } = await supabase
        .from('scenario_summaries')
        .select('id')
        .eq('amortization_id', amortizationId);

      if (fetchError) throw fetchError;

      if (summaries && summaries.length > 0) {
        const scenarioIds = summaries.map(s => s.id);

        // Delete all payments first
        const { error: paymentsError } = await supabase
          .from('scenario_payments')
          .delete()
          .in('scenario_summary_id', scenarioIds);

        if (paymentsError) throw paymentsError;

        // Then delete all summaries
        const { error: summariesError } = await supabase
          .from('scenario_summaries')
          .delete()
          .eq('amortization_id', amortizationId);

        if (summariesError) throw summariesError;
      }
    } catch (error) {
      console.error('Error cleaning up scenarios:', error);
      throw error;
    }
  }

  async storeScenarios(
    amortization: AmortizationInput,
    scenarios: Record<ScenarioType, {
      summary: ScenarioSummaryResult
      payments: PaymentRow[]
    }>
  ): Promise<void> {
    try {
      // Insert or update scenarios one by one
      for (const [scenarioType, scenario] of Object.entries(scenarios)) {
        // Upsert the scenario summary
        const { data: summaryData, error: summaryError } = await supabase
          .from('scenario_summaries')
          .upsert({
            amortization_id: amortization.id,
            scenario_type: scenarioType as ScenarioType,
            total_interest_and_insurance: scenario.summary.total_interest_and_insurance,
            total_months: scenario.summary.total_months,
            monthly_payment: scenario.summary.monthly_payment
          }, {
            onConflict: 'amortization_id,scenario_type',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (summaryError) {
          console.error('Error upserting scenario summary:', summaryError);
          throw summaryError;
        }

        if (!summaryData) {
          throw new Error('No summary data returned after upsert');
        }

        // Delete existing payments for this summary
        const { error: deleteError } = await supabase
          .from('scenario_payments')
          .delete()
          .eq('scenario_summary_id', summaryData.id);

        if (deleteError) {
          console.error('Error deleting existing payments:', deleteError);
          throw deleteError;
        }

        // Insert the new payments for this scenario
        const paymentsToInsert = scenario.payments.map(payment => ({
          scenario_summary_id: summaryData.id,
          payment_date: payment.payment_date.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          capital: payment.capital,
          interest: payment.interest,
          property_insurance: payment.property_insurance,
          loan_insurance: payment.loan_insurance,
          monthly_payment: payment.monthly_payment,
          is_different_from_base: payment.is_different_from_base
        }));

        // Insert payments in chunks to avoid hitting request size limits
        const chunkSize = 100;
        for (let i = 0; i < paymentsToInsert.length; i += chunkSize) {
          const chunk = paymentsToInsert.slice(i, i + chunkSize);
          const { error: paymentsError } = await supabase
            .from('scenario_payments')
            .insert(chunk);

          if (paymentsError) {
            console.error('Error inserting scenario payments:', paymentsError);
            throw paymentsError;
          }
        }
      }
    } catch (error) {
      console.error('Error in storeScenarios:', error);
      throw error;
    }
  }
} 