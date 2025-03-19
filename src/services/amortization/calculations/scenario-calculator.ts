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
  private calculateMonthlyRate(interestRate: number, installmentsPerYear: number): number {
    // Convert to effective monthly rate using EAR formula
    // Formula: monthlyRate = (1 + annualRate/100)^(1/12) - 1
    // This properly accounts for compounding instead of simple division
    return Math.pow(1 + interestRate/100, 1/12) - 1;
  }

  private calculateMonthlyPayment(
    loanAmount: number,
    annualRate: number,
    totalMonths: number,
    installmentsPerYear: number = 12
  ): number {
    const monthlyRate = this.calculateMonthlyRate(annualRate, installmentsPerYear)
    
    // Use binary search for all cases to be consistent
    return this.findCorrectMonthlyInstallment(
      loanAmount,
      monthlyRate,
      totalMonths,
      installmentsPerYear
    )
  }

  private findCorrectMonthlyInstallment(
    loanAmount: number,
    monthlyRate: number,  // Changed: now receiving monthly rate instead of annual
    totalMonths: number,
    installmentsPerYear: number
  ): number {
    // Function to calculate final balance for a given monthly installment
    const calculateFinalBalance = (monthlyInstallmentGuess: number): number => {
      let balance = loanAmount
      
      for (let i = 0; i < totalMonths; i++) {
        const isDoubleMonth = installmentsPerYear === 14 && (i % 12 === 6 || i % 12 === 11)
        const interest = Number((balance * monthlyRate).toFixed(10))
        const installment = isDoubleMonth ? monthlyInstallmentGuess * 2 : monthlyInstallmentGuess
        const principal = Number((installment - interest).toFixed(10))
        balance = Number((balance - principal).toFixed(10))
      }
      
      return balance
    }

    // Binary search implementation
    let low = 0
    let high = loanAmount * 2  // Changed: Use loanAmount * 2 as upper bound
    let guess = (low + high) / 2
    const tolerance = 0.0000001
    let iterations = 0
    const maxIterations = 1000

    while (Math.abs(calculateFinalBalance(guess)) > tolerance && iterations < maxIterations) {
      const balance = calculateFinalBalance(guess)
      
      if (balance > 0) {
        low = guess
      } else {
        high = guess
      }
      
      guess = Number(((low + high) / 2).toFixed(10))
      iterations++
    }

    if (iterations >= maxIterations) {
      console.warn('Maximum iterations reached in findCorrectMonthlyInstallment')
    }

    return guess
  }

  private calculateExtraPaymentsImpact(
    extraInstallments: ExtraInstallment[],
    firstInstallmentDate: Date,
    totalMonths: number
  ): number {
    // If no extra installments, return 0 early
    if (!extraInstallments || extraInstallments.length === 0) {
      console.log('No extra installments to process');
      return 0;
    }
    
    let totalExtraPayments = 0;
    
    // Extract day, month, year from firstInstallmentDate to avoid timezone issues
    const firstYear = firstInstallmentDate.getFullYear();
    const firstMonth = firstInstallmentDate.getMonth();
    const firstDay = firstInstallmentDate.getDate();
    
    // Format as YYYY-MM-DD for consistent comparison
    const firstDateStr = `${firstYear}-${String(firstMonth + 1).padStart(2, '0')}-${String(firstDay).padStart(2, '0')}`;
    
    console.log('===== EXTRA PAYMENTS CALCULATION =====');
    console.log(`First installment date: ${firstDateStr}`);
    console.log(`Processing ${extraInstallments.length} extra installment(s):`);
    
    extraInstallments.forEach((installment, index) => {
      console.log(`\nExtra installment #${index + 1}:`);
      console.log(`- Amount: ${installment.amount}`);
      console.log(`- Frequency: ${installment.frequency}`);
      console.log(`- Start date (from DB): ${installment.start_date}`);
      
      // Parse and normalize the extra installment date safely
      let startDateStr: string;
      let startDay: number;
      let startMonth: number;
      let startYear: number;
      
      try {
        // Check if we already have a YYYY-MM-DD format string
        if (typeof installment.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(installment.start_date)) {
          startDateStr = installment.start_date;
          // Parse the components for later use
          [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
          // Adjust month to be 0-based for consistent comparison
          startMonth = startMonth - 1;
        } else {
          // Create a new date object and extract components to create YYYY-MM-DD
          const tempDate = new Date(installment.start_date);
          startYear = tempDate.getFullYear();
          startMonth = tempDate.getMonth(); // Already 0-based
          startDay = tempDate.getDate();
          startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
        // Skip this installment if date parsing fails
        return;
      }
      
      console.log(`- Normalized start date: ${startDateStr}`);
      console.log(`- Date components: year=${startYear}, month=${startMonth + 1}, day=${startDay}`);
      
      if (installment.frequency === 'one-time') {
        // Compare actual date components for more accurate comparison
        // First compare years
        const yearComparison = startYear - firstYear;
        
        // If years are different, that determines the result
        if (yearComparison > 0) {
          // Start year is after first year
          totalExtraPayments += installment.amount;
          console.log(`- INCLUDED: Adding ${installment.amount} to total (year comparison)`);
        } else if (yearComparison < 0) {
          // Start year is before first year
          console.log('- EXCLUDED: Before first installment date (year comparison)');
        } else {
          // Years are the same, compare months
          const monthComparison = startMonth - firstMonth;
          
          if (monthComparison > 0) {
            // Start month is after first month
            totalExtraPayments += installment.amount;
            console.log(`- INCLUDED: Adding ${installment.amount} to total (month comparison)`);
          } else if (monthComparison < 0) {
            // Start month is before first month
            console.log('- EXCLUDED: Before first installment date (month comparison)');
          } else {
            // Months are the same, compare days
            const dayComparison = startDay - firstDay;
            
            // Handle the special case for the 1st of the month
            if (startDay === 1) {
              console.log(`- SPECIAL CASE: 1st of month date`);
              console.log(`- First day: ${firstDay}, Start day: ${startDay}`);
              console.log(`- First month/year: ${firstMonth + 1}/${firstYear}, Start month/year: ${startMonth + 1}/${startYear}`);
              
              // Check if the date is on or after the first installment date
              const isAfterFirstDate = 
                startYear > firstYear || 
                (startYear === firstYear && startMonth > firstMonth) || 
                (startYear === firstYear && startMonth === firstMonth && startDay >= firstDay);
                
              console.log(`- Is after first installment date? ${isAfterFirstDate}`);
              
              if (isAfterFirstDate) {
                // Always include if it's the first of the month and date is on or after first installment
                totalExtraPayments += installment.amount;
                console.log(`- INCLUDED: Adding ${installment.amount} to total (1st of month date on or after first installment)`);
              } else {
                console.log(`- EXCLUDED: 1st of month date before first installment date`);
              }
            } else if (dayComparison >= 0) {
              // Start day is on or after first day
              totalExtraPayments += installment.amount;
              console.log(`- INCLUDED: Adding ${installment.amount} to total (day comparison)`);
            } else {
              // Start day is before first day
              console.log('- EXCLUDED: Before first installment date (day comparison)');
            }
          }
        }
      } else { // monthly
        // Calculate month difference for remaining payments
        // Create date objects from the strings for comparison
        
        // Calculate years and months difference
        const yearsDiff = startYear - firstYear;
        const monthsDiff = startMonth - firstMonth; // Both are 0-based now
        
        // Calculate months since start
        let monthsSinceStart = yearsDiff * 12 + monthsDiff;
        
        // Adjust for day of month if needed, but handle the 1st of month special case
        if (startDay !== 1 && startDay < firstDay) {
          // If start day is earlier in the month than first day (and not the 1st),
          // we need one fewer month
          monthsSinceStart--;
        }
        
        // Calculate remaining months
        const remainingMonths = totalMonths - Math.max(0, monthsSinceStart);
        
        console.log(`- Years difference: ${yearsDiff}`);
        console.log(`- Months difference: ${monthsDiff}`);
        console.log(`- Total months since start: ${monthsSinceStart}`);
        console.log(`- Remaining months: ${remainingMonths}`);
        
        if (remainingMonths > 0) {
          const monthlyCumulative = installment.amount * remainingMonths;
          totalExtraPayments += monthlyCumulative;
          console.log(`- INCLUDED: Adding ${installment.amount} × ${remainingMonths} = ${monthlyCumulative}`);
        } else {
          console.log('- EXCLUDED: No remaining months after start date');
        }
      }
    });
    
    console.log(`\nTotal extra payments calculated: ${totalExtraPayments}`);
    return totalExtraPayments;
  }

  private calculateRegularPayments(
    amortization: AmortizationInput,
    firstInstallmentDate: Date
  ): PaymentRow[] {
    try {
      // Log the actual first payment date for debugging
      console.log('calculateRegularPayments - First installment date:', firstInstallmentDate);
      
      const totalMonths = amortization.term_years * 12
      const monthlyRate = this.calculateMonthlyRate(amortization.interest_rate, amortization.installments_per_year)
      const monthlyPayment = this.findCorrectMonthlyInstallment(
        amortization.loan_amount,
        monthlyRate,
        totalMonths,
        amortization.installments_per_year
      )

      const payments: PaymentRow[] = []
      let remainingBalance = amortization.loan_amount

      for (let month = 0; month < totalMonths; month++) {
        const currentDate = addMonths(firstInstallmentDate, month)
        const isDoublePayment = amortization.installments_per_year === 14 && 
          (currentDate.getMonth() === 6 || currentDate.getMonth() === 11)
        
        const currentMonthlyPayment = isDoublePayment ? monthlyPayment * 2 : monthlyPayment
        const monthlyInterest = remainingBalance * monthlyRate
        const monthlyPrincipal = currentMonthlyPayment - monthlyInterest
        
        const currentPropertyInsurance = isDoublePayment ? 
          amortization.property_insurance * 2 : 
          amortization.property_insurance
        
        const currentLoanInsurance = isDoublePayment ? 
          amortization.loan_insurance * 2 : 
          amortization.loan_insurance

        payments.push({
          payment_date: currentDate,
          capital: monthlyPrincipal,
          interest: monthlyInterest,
          property_insurance: currentPropertyInsurance,
          loan_insurance: currentLoanInsurance,
          monthly_payment: currentMonthlyPayment + currentPropertyInsurance + currentLoanInsurance,
          is_different_from_base: false
        })

        remainingBalance -= monthlyPrincipal
      }

      return payments
    } catch (error) {
      console.error('Error in calculateRegularPayments:', error)
      throw error
    }
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
    const firstInstallmentDate = new Date(amortization.first_installment_date)
    console.log('ACTUAL first installment date:', firstInstallmentDate);
    
    const monthlyRate = this.calculateMonthlyRate(amortization.interest_rate, amortization.installments_per_year)
    
    let payments: PaymentRow[] = []

    switch (scenarioType) {
      case 'regular': {
        payments = this.calculateRegularPayments(amortization, firstInstallmentDate)
        break
      }
      case 'accelerated': {
        // First, let's log each installment to check what's happening
        console.log('\n===== ACCELERATED SCENARIO =====');
        console.log(`Original loan amount: ${amortization.loan_amount}`);
        console.log(`Extra installments:`, extraInstallments.map(i => ({
          amount: i.amount,
          frequency: i.frequency,
          date: i.start_date,
          isFirstOfMonth: new Date(i.start_date).getDate() === 1
        })));
        
        // FOR DEBUGGING: Test if we're handling 1st of month correctly
        console.log("First of month installments:", extraInstallments.filter(i => 
          new Date(i.start_date).getDate() === 1
        ).map(i => ({
          amount: i.amount,
          date: i.start_date
        })));
        
        // REVISED APPROACH: Calculate total extra payments directly
        // Explicitly handle first-of-month dates
        let totalExtraPayments = 0;
        extraInstallments.forEach(installment => {
          const installmentDate = new Date(installment.start_date);
          const isAfterFirstDate = installmentDate >= firstInstallmentDate;
          
          console.log(`Processing installment: ${installmentDate.toISOString()}, amount: ${installment.amount}`);
          console.log(`Is after first installment date (${firstInstallmentDate.toISOString()})? ${isAfterFirstDate}`);
          
          if (isAfterFirstDate) {
            if (installment.frequency === 'one-time') {
              totalExtraPayments += installment.amount;
              console.log(`Added one-time payment: ${installment.amount}`);
            } else {
              // Calculate months for monthly payment
              const monthsLeft = totalMonths - Math.floor(
                (installmentDate.getTime() - firstInstallmentDate.getTime()) / 
                (30.44 * 24 * 60 * 60 * 1000)
              );
              if (monthsLeft > 0) {
                const amount = installment.amount * monthsLeft;
                totalExtraPayments += amount;
                console.log(`Added monthly payment: ${installment.amount} × ${monthsLeft} = ${amount}`);
              }
            }
          } else {
            console.log(`Skipped: Installment date is before first installment date`);
          }
        });
        
        console.log(`Total extra payments calculated: ${totalExtraPayments}`);
        
        // Check if we actually have any extra payments to apply
        if (totalExtraPayments <= 0) {
          console.log('WARNING: No effective extra payments for accelerated scenario');
          console.log('Accelerated scenario will be identical to regular scenario');
          payments = this.calculateRegularPayments(amortization, firstInstallmentDate).map(payment => ({
            ...payment,
            is_different_from_base: false
          }));
          break;
        }
        
        const adjustedLoanAmount = amortization.loan_amount - totalExtraPayments;
        console.log(`Adjusted loan amount: ${adjustedLoanAmount}`);
        
        const baseMonthlyPayment = this.findCorrectMonthlyInstallment(
          amortization.loan_amount,
          monthlyRate,
          totalMonths,
          amortization.installments_per_year
        );
        console.log(`Base monthly payment: ${baseMonthlyPayment}`);

        // Keep the same monthly payment but reduce the number of months
        const adjustedTotalMonths = Math.ceil(
          Math.log(
            baseMonthlyPayment /
              (baseMonthlyPayment - (adjustedLoanAmount * monthlyRate))
          ) / Math.log(1 + monthlyRate)
        );
        console.log(`Calculated adjusted months: ${adjustedTotalMonths} (vs original ${totalMonths})`);
        
        // Sanity check - if the month reduction doesn't make sense, use the original months
        const finalMonths = (adjustedTotalMonths > 0 && adjustedTotalMonths < totalMonths) 
          ? adjustedTotalMonths 
          : totalMonths;
          
        console.log(`Final months for accelerated scenario: ${finalMonths}`);
        
        let remainingBalance = adjustedLoanAmount;

        // Generate the accelerated scenario payment schedule
        for (let month = 0; month < finalMonths; month++) {
          const currentDate = addMonths(firstInstallmentDate, month);
          const isDoublePayment = amortization.installments_per_year === 14 && 
            (currentDate.getMonth() === 6 || currentDate.getMonth() === 11);
          
          const currentMonthlyPayment = isDoublePayment ? baseMonthlyPayment * 2 : baseMonthlyPayment;
          const monthlyInterest = remainingBalance * monthlyRate;
          const monthlyPrincipal = currentMonthlyPayment - monthlyInterest;
          
          const currentPropertyInsurance = isDoublePayment ? 
            amortization.property_insurance * 2 : 
            amortization.property_insurance;
          
          const currentLoanInsurance = isDoublePayment ? 
            amortization.loan_insurance * 2 : 
            amortization.loan_insurance;

          payments.push({
            payment_date: currentDate,
            capital: monthlyPrincipal,
            interest: monthlyInterest,
            property_insurance: currentPropertyInsurance,
            loan_insurance: currentLoanInsurance,
            monthly_payment: currentMonthlyPayment + currentPropertyInsurance + currentLoanInsurance,
            is_different_from_base: true
          });

          remainingBalance -= monthlyPrincipal;
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
        const adjustedMonthlyPayment = this.findCorrectMonthlyInstallment(
          adjustedLoanAmount,
          monthlyRate,
          totalMonths,
          amortization.installments_per_year
        )

        let remainingBalance = adjustedLoanAmount

        for (let month = 0; month < totalMonths; month++) {
          const currentDate = addMonths(firstInstallmentDate, month)
          const isDoublePayment = amortization.installments_per_year === 14 && 
            (currentDate.getMonth() === 6 || currentDate.getMonth() === 11)
          
          const currentMonthlyPayment = isDoublePayment ? adjustedMonthlyPayment * 2 : adjustedMonthlyPayment
          const monthlyInterest = remainingBalance * monthlyRate
          const monthlyPrincipal = currentMonthlyPayment - monthlyInterest
          
          const currentPropertyInsurance = isDoublePayment ? 
            amortization.property_insurance * 2 : 
            amortization.property_insurance
          
          const currentLoanInsurance = isDoublePayment ? 
            amortization.loan_insurance * 2 : 
            amortization.loan_insurance

          payments.push({
            payment_date: currentDate,
            capital: monthlyPrincipal,
            interest: monthlyInterest,
            property_insurance: currentPropertyInsurance,
            loan_insurance: currentLoanInsurance,
            monthly_payment: currentMonthlyPayment + currentPropertyInsurance + currentLoanInsurance,
            is_different_from_base: true
          })

          remainingBalance -= monthlyPrincipal
        }
        break
      }
      case 'new_rate': {
        let currentRate = amortization.interest_rate
        let remainingBalance = amortization.loan_amount
        let currentMonthlyPayment = this.findCorrectMonthlyInstallment(
          amortization.loan_amount,
          monthlyRate,
          totalMonths,
          amortization.installments_per_year
        )

        for (let month = 0; month < totalMonths; month++) {
          const currentDate = addMonths(firstInstallmentDate, month)
          const isDoublePayment = amortization.installments_per_year === 14 && 
            (currentDate.getMonth() === 6 || currentDate.getMonth() === 11)
          
          // Check if there's a rate change for this month
          const rateChange = rateChanges.find(change => 
            new Date(change.effective_date).getTime() === currentDate.getTime()
          )

          if (rateChange) {
            currentRate = rateChange.new_interest_rate
            const remainingPayments = totalMonths - month
            const newMonthlyRate = this.calculateMonthlyRate(currentRate, amortization.installments_per_year)
            currentMonthlyPayment = this.findCorrectMonthlyInstallment(
              remainingBalance,
              newMonthlyRate,
              remainingPayments,
              amortization.installments_per_year
            )
          }

          const currentMonthlyRate = this.calculateMonthlyRate(currentRate, amortization.installments_per_year)
          const currentBasePayment = isDoublePayment ? currentMonthlyPayment * 2 : currentMonthlyPayment
          const monthlyInterest = remainingBalance * currentMonthlyRate
          const monthlyPrincipal = currentBasePayment - monthlyInterest
          
          const currentPropertyInsurance = isDoublePayment ? 
            amortization.property_insurance * 2 : 
            amortization.property_insurance
          
          const currentLoanInsurance = isDoublePayment ? 
            amortization.loan_insurance * 2 : 
            amortization.loan_insurance

          payments.push({
            payment_date: currentDate,
            capital: monthlyPrincipal,
            interest: monthlyInterest,
            property_insurance: currentPropertyInsurance,
            loan_insurance: currentLoanInsurance,
            monthly_payment: currentBasePayment + currentPropertyInsurance + currentLoanInsurance,
            is_different_from_base: true
          })

          remainingBalance -= monthlyPrincipal
        }
        break
      }
    }

    // Calculate summary
    const totalInterest = payments.reduce((sum, payment) => sum + payment.interest, 0)
    const totalInsurance = payments.reduce((sum, payment) => 
      sum + payment.property_insurance + payment.loan_insurance, 0)

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