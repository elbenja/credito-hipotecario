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
      let startYear: number;
      let startMonth: number; // 0-indexed
      let startDay: number;
      
      try {
        // Direct parsing for YYYY-MM-DD format
        if (typeof installment.start_date === 'string') {
          const dateMatch = installment.start_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (dateMatch) {
            // Parse directly from the string components
            startYear = parseInt(dateMatch[1]);
            startMonth = parseInt(dateMatch[2]) - 1; // Convert to 0-based
            startDay = parseInt(dateMatch[3]);
          } else {
            // Fallback to Date object if not in YYYY-MM-DD format
            const tempDate = new Date(installment.start_date);
            startYear = tempDate.getFullYear();
            startMonth = tempDate.getMonth();
            startDay = tempDate.getDate();
          }
        } else {
          // Handle if it's already a Date object
          const tempDate = new Date(installment.start_date);
          startYear = tempDate.getFullYear();
          startMonth = tempDate.getMonth();
          startDay = tempDate.getDate();
        }
        
        // For debugging
        const startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        console.log(`- Parsed date components: Year=${startYear}, Month=${startMonth + 1}, Day=${startDay}`);
        console.log(`- Normalized start date: ${startDateStr}`);
      } catch (e) {
        console.error('Error parsing date:', e);
        // Skip this installment if date parsing fails
        return;
      }
      
      // CRITICAL: Create proper date objects with noon time to avoid timezone issues
      const startDateObj = new Date(startYear, startMonth, startDay, 12, 0, 0, 0);
      const firstDateObj = new Date(firstYear, firstMonth, firstDay, 12, 0, 0, 0);
      
      // Simple boolean to determine if start date is on or after first date
      const isOnOrAfterFirstDate = startDateObj >= firstDateObj;
      
      console.log(`- Is on or after first installment date? ${isOnOrAfterFirstDate}`);
      
      if (installment.frequency === 'one-time') {
        if (isOnOrAfterFirstDate) {
          totalExtraPayments += installment.amount;
          console.log(`- INCLUDED: Adding ${installment.amount} to total (one-time payment)`);
        } else {
          console.log('- EXCLUDED: Before first installment date');
        }
      } else { // monthly
        if (isOnOrAfterFirstDate) {
          // Calculate months difference accurately
          // First get the difference in months from date components
          const yearsDiff = startYear - firstYear;
          const monthsDiff = startMonth - firstMonth;
          const totalMonthsDiff = yearsDiff * 12 + monthsDiff;
          
          // Adjust for day comparison if needed
          const adjustedMonthsDiff = 
            (totalMonthsDiff === 0 && startDay < firstDay) ? -1 : // same month, but earlier day
            totalMonthsDiff;
          
          // Calculate remaining months
          const remainingMonths = totalMonths - Math.max(0, adjustedMonthsDiff);
          
          console.log(`- Years difference: ${yearsDiff}`);
          console.log(`- Months difference: ${monthsDiff}`);
          console.log(`- Adjusted months difference: ${adjustedMonthsDiff}`);
          console.log(`- Remaining months: ${remainingMonths}`);
          
          if (remainingMonths > 0) {
            const monthlyCumulative = installment.amount * remainingMonths;
            totalExtraPayments += monthlyCumulative;
            console.log(`- INCLUDED: Adding ${installment.amount} × ${remainingMonths} = ${monthlyCumulative}`);
          } else {
            console.log('- EXCLUDED: No remaining months after start date');
          }
        } else {
          console.log('- EXCLUDED: Monthly payment starts before first installment date');
        }
      }
    });
    
    console.log(`\nTotal extra payments calculated: ${totalExtraPayments}`);
    
    // If no effective extra payments, log a warning
    if (totalExtraPayments <= 0) {
      console.log('WARNING: No effective extra payments calculated');
    }
    
    return totalExtraPayments;
  }

  private calculateRegularPayments(
    amortization: AmortizationInput,
    firstInstallmentDate: Date
  ): PaymentRow[] {
    try {
      // Enhanced logging for date debugging
      console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++');
      console.log('calculateRegularPayments - First installment date received:', firstInstallmentDate);
      console.log('Original date components:', {
        year: firstInstallmentDate.getFullYear(),
        month: firstInstallmentDate.getMonth() + 1,
        day: firstInstallmentDate.getDate(),
        hours: firstInstallmentDate.getHours()
      });
      
      // Store the original day of month to ensure we preserve it
      const originalDay = firstInstallmentDate.getDate();
      const originalMonth = firstInstallmentDate.getMonth();
      const originalYear = firstInstallmentDate.getFullYear();
      
      console.log('Day of month to preserve:', originalDay);
      console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++');
      
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
        // Create payment date that properly preserves the day of month
        // Instead of using addMonths which can shift days, create a new date
        // and set the year/month explicitly
        const currentDate = new Date(
          originalYear, 
          originalMonth + month, 
          originalDay, 
          12, 0, 0, 0
        );
        
        // Log detailed info for first few payments
        if (month < 5) {
          console.log(`Payment ${month+1} scheduled for: ${currentDate.toISOString()}`);
          console.log(`Payment ${month+1} components:`, {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            day: currentDate.getDate()
          });
        }

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
    
    // Ensure correct date handling for first installment date
    console.log('-----------------------------------------------------------');
    console.log(`ScenarioCalculator [${scenarioType}] - First installment date from input:`, amortization.first_installment_date);
    
    // CRITICAL FIX: Properly parse YYYY-MM-DD date string to preserve the exact date
    // Check if we have a YYYY-MM-DD format string
    let year, month, day;
    
    if (typeof amortization.first_installment_date === 'string') {
      // Try to parse as YYYY-MM-DD first
      const dateMatch = amortization.first_installment_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        // We have a YYYY-MM-DD format, extract components directly
        year = parseInt(dateMatch[1]);
        month = parseInt(dateMatch[2]) - 1; // Convert to 0-based month
        day = parseInt(dateMatch[3]);
      } else {
        // Parse as regular date
        const tempDate = new Date(amortization.first_installment_date);
        year = tempDate.getFullYear();
        month = tempDate.getMonth();
        day = tempDate.getDate();
      }
    } else {
      // Handle if it's already a Date object
      const tempDate = new Date(amortization.first_installment_date);
      year = tempDate.getFullYear();
      month = tempDate.getMonth();
      day = tempDate.getDate();
    }
    
    // Create a new Date at noon to avoid timezone issues
    const firstInstallmentDate = new Date(year, month, day, 12, 0, 0, 0);
    
    // Log detailed information about the date
    console.log(`ScenarioCalculator [${scenarioType}] - Parsed date:`, firstInstallmentDate.toISOString());
    console.log(`ScenarioCalculator [${scenarioType}] - Date components:`, {
      year: year,
      month: month + 1, // Display 1-based month for logging 
      day: day,
      hours: firstInstallmentDate.getHours()
    });
    console.log('-----------------------------------------------------------');
    
    const monthlyRate = this.calculateMonthlyRate(amortization.interest_rate, amortization.installments_per_year)
    
    let payments: PaymentRow[] = []

    switch (scenarioType) {
      case 'regular': {
        payments = this.calculateRegularPayments(amortization, firstInstallmentDate)
        break
      }
      case 'accelerated': {
        console.log('Calculating accelerated scenario with extra payments');
        
        // Use the improved, common method to calculate total extra payments
        const totalExtraPayments = this.calculateExtraPaymentsImpact(
          extraInstallments,
          firstInstallmentDate,
          totalMonths
        );
        
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
          // Create payment date that properly preserves the day of month
          const currentDate = new Date(
            firstInstallmentDate.getFullYear(),
            firstInstallmentDate.getMonth() + month,
            firstInstallmentDate.getDate(),
            12, 0, 0, 0
          );
          
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
          // Create payment date that properly preserves the day of month
          const currentDate = new Date(
            firstInstallmentDate.getFullYear(),
            firstInstallmentDate.getMonth() + month,
            firstInstallmentDate.getDate(),
            12, 0, 0, 0
          );
          
          const isDoublePayment = amortization.installments_per_year === 14 && 
            (currentDate.getMonth() === 6 || currentDate.getMonth() === 11);
          
          const currentMonthlyPayment = isDoublePayment ? adjustedMonthlyPayment * 2 : adjustedMonthlyPayment;
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
          // Create payment date that properly preserves the day of month
          const currentDate = new Date(
            firstInstallmentDate.getFullYear(),
            firstInstallmentDate.getMonth() + month,
            firstInstallmentDate.getDate(),
            12, 0, 0, 0
          );
          
          const isDoublePayment = amortization.installments_per_year === 14 && 
            (currentDate.getMonth() === 6 || currentDate.getMonth() === 11);
          
          // Check if there's a rate change for this month
          const rateChange = rateChanges.find(change => {
            const changeDate = new Date(change.effective_date);
            return (
              changeDate.getFullYear() === currentDate.getFullYear() &&
              changeDate.getMonth() === currentDate.getMonth() &&
              changeDate.getDate() === currentDate.getDate()
            );
          });

          if (rateChange) {
            currentRate = rateChange.new_interest_rate;
            const remainingPayments = totalMonths - month;
            const newMonthlyRate = this.calculateMonthlyRate(currentRate, amortization.installments_per_year);
            currentMonthlyPayment = this.findCorrectMonthlyInstallment(
              remainingBalance,
              newMonthlyRate,
              remainingPayments,
              amortization.installments_per_year
            );
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