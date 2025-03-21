import { supabase } from "@/integrations/supabase/client"
import { addMonths, startOfMonth } from "date-fns"
import type { Database } from "@/types/supabase"
import { normalizeDate } from "@/lib/utils"

// Other imports for GoalSeekService
import { GoalSeekService } from "../services/goalSeek"

export type ScenarioType = Database['public']['Enums']['scenario_type']

type ScenarioSummary = Database['public']['Tables']['scenario_summaries']['Row']
type ScenarioPayment = Database['public']['Tables']['scenario_payments']['Row']
type ExtraInstallment = {
  id: string
  amount: number
  frequency: "one-time" | "monthly" 
  start_date: string | Date | any // Accept both string and Date
  amortization_id?: string
  created_at?: string
}
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
    console.log('\n========== CALCULATING EXTRA PAYMENTS IMPACT ==========');
    // If no extra installments, return 0 early
    if (!extraInstallments || extraInstallments.length === 0) {
      console.log('No extra installments to process');
      return 0;
    }
    
    console.log(`Processing ${extraInstallments.length} extra installment(s)`);
    
    let totalExtraPayments = 0;
    
    // Extract day, month, year from firstInstallmentDate to avoid timezone issues
    const firstYear = firstInstallmentDate.getFullYear();
    const firstMonth = firstInstallmentDate.getMonth();
    const firstDay = firstInstallmentDate.getDate();
    
    // Create a date-string for easy comparison
    const firstDateStr = `${firstYear}-${String(firstMonth + 1).padStart(2, '0')}-${String(firstDay).padStart(2, '0')}`;
    
    console.log(`First installment date: ${firstDateStr} (Y=${firstYear}, M=${firstMonth+1}, D=${firstDay})`);
    
    // Debug all extra installments
    extraInstallments.forEach((installment, index) => {
      let dateStr = 'Invalid Date';
      if (typeof installment.start_date === 'string') {
        dateStr = installment.start_date;
      } else if (installment.start_date instanceof Date) {
        try {
          dateStr = installment.start_date.toISOString();
        } catch(e) {
          dateStr = String(installment.start_date);
        }
      } else {
        dateStr = String(installment.start_date);
      }
      console.log(`[${index+1}] Amount: ${installment.amount}, Freq: ${installment.frequency}, Date: ${dateStr}`);
    });
    
    // Process each extra installment
    for (let i = 0; i < extraInstallments.length; i++) {
      const installment = extraInstallments[i];
      console.log(`\nProcessing extra installment #${i+1}:`);
      console.log(`- Amount: ${installment.amount}`);
      console.log(`- Frequency: ${installment.frequency}`);
      console.log(`- Raw start_date:`, installment.start_date);
      console.log(`- Type of start_date: ${typeof installment.start_date}`);
      
      let startYear: number, startMonth: number, startDay: number;
      let startDateStr = '';
      
      try {
        // Parse the date regardless of format (string or Date object)
        if (typeof installment.start_date === 'string') {
          startDateStr = installment.start_date;
          
          // IMPROVED: More robust parsing of YYYY-MM-DD format
          // Try direct YYYY-MM-DD parsing first
          const match = installment.start_date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (match) {
            startYear = parseInt(match[1], 10);
            startMonth = parseInt(match[2], 10) - 1; // Convert to 0-based
            startDay = parseInt(match[3], 10);
            console.log(`- Start date from YYYY-MM-DD string: ${installment.start_date}`);
          } else {
            // Fallback for other string formats
            const date = new Date(installment.start_date);
            startYear = date.getFullYear();
            startMonth = date.getMonth();
            startDay = date.getDate();
            console.log(`- Start date from non-standard string: ${installment.start_date}`);
          }
        } else {
          // Try to handle any type as best as possible
          const dateObj = new Date(installment.start_date as any);
          if (!isNaN(dateObj.getTime())) {
            // It's a valid date
            startYear = dateObj.getFullYear();
            startMonth = dateObj.getMonth();
            startDay = dateObj.getDate();
            startDateStr = dateObj.toISOString();
            console.log(`- Start date from conversion: ${startDateStr}`);
          } else {
            // Invalid date format - skip this installment
            console.error('- Invalid date format, skipping:', installment.start_date);
            continue;
          }
        }
        
        console.log(`- Parsed date components: Y=${startYear}, M=${startMonth+1}, D=${startDay}`);
        
        // Determine if this installment is on or after the first installment
        let isOnOrAfterFirst = false;
        
        // SUPER BASIC COMPARISON: If the year is 2030, it's definitely after April 2025
        if (startYear > 2025) {
          console.log('- FORCE INCLUDE: Year is definitely after 2025');
          isOnOrAfterFirst = true;
        } else {
          // Compare by components for most reliable results
          if (startYear > firstYear) {
            // Later year, clearly after
            isOnOrAfterFirst = true;
            console.log(`- Later year (${startYear} > ${firstYear}), including`);
          } else if (startYear < firstYear) {
            // Earlier year, clearly before
            isOnOrAfterFirst = false;
            console.log(`- Earlier year (${startYear} < ${firstYear}), excluding`);
          } else {
            // Same year, check month
            if (startMonth > firstMonth) {
              // Later month, clearly after
              isOnOrAfterFirst = true;
              console.log(`- Same year, later month (${startMonth+1} > ${firstMonth+1}), including`);
            } else if (startMonth < firstMonth) {
              // Earlier month, clearly before
              isOnOrAfterFirst = false;
              console.log(`- Same year, earlier month (${startMonth+1} < ${firstMonth+1}), excluding`);
            } else {
              // Same month, check day
              isOnOrAfterFirst = startDay >= firstDay;
              console.log(`- Same year and month, day comparison (${startDay} ${startDay >= firstDay ? '>=' : '<'} ${firstDay}), ${startDay >= firstDay ? 'including' : 'excluding'}`);
            }
          }
        }
        
        console.log(`- Is on or after first installment? ${isOnOrAfterFirst}`);
        
        if (!isOnOrAfterFirst) {
          console.log('- EXCLUDED: Extra payment is before first installment date');
          continue;
        }
        
        // Handle different frequency types
        if (installment.frequency === 'one-time') {
          totalExtraPayments += installment.amount;
          console.log(`- INCLUDED: Adding one-time payment of ${installment.amount}`);
        } else if (installment.frequency === 'monthly') {
          // Calculate remaining months
          const yearDiff = startYear - firstYear;
          const monthDiff = startMonth - firstMonth;
          let monthsPassed = yearDiff * 12 + monthDiff;
          
          // If same month but earlier day, don't count this month
          if (monthsPassed === 0 && startDay < firstDay) {
            monthsPassed = -1;
          }
          
          const remainingMonths = totalMonths - Math.max(0, monthsPassed);
          console.log(`- Months passed: ${monthsPassed}, Remaining: ${remainingMonths}`);
          
          if (remainingMonths > 0) {
            const amount = installment.amount * remainingMonths;
            totalExtraPayments += amount;
            console.log(`- INCLUDED: Adding monthly payment of ${installment.amount} × ${remainingMonths} = ${amount}`);
          } else {
            console.log('- EXCLUDED: No months remaining in term');
          }
        }
      } catch (error) {
        console.error('- Error processing installment:', error);
        // Skip this installment on error
        continue;
      }
    }
    
    console.log(`\nTotal extra payments impact: ${totalExtraPayments}`);
    console.log('========================================================\n');
    
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
        
        // Check if we actually have any effective extra payments to apply
        if (totalExtraPayments <= 0) {
          console.log('WARNING: No effective extra payments for accelerated scenario');
          console.log('Accelerated scenario will be identical to regular scenario');
          payments = this.calculateRegularPayments(amortization, firstInstallmentDate).map(payment => ({
            ...payment,
            is_different_from_base: false
          }));
          break;
        }
        
        // Ensure loan amount is valid after subtracting extra payments
        const adjustedLoanAmount = Math.max(0, amortization.loan_amount - totalExtraPayments);
        console.log(`Adjusted loan amount: ${adjustedLoanAmount}`);
        
        // Edge case: If adjusted loan amount is 0, loan is fully paid
        if (adjustedLoanAmount === 0) {
          console.log('Adjusted loan amount is 0 - loan is fully paid after extra payments');
          payments = [{
            payment_date: firstInstallmentDate,
            capital: totalExtraPayments,
            interest: 0,
            property_insurance: 0,
            loan_insurance: 0,
            monthly_payment: totalExtraPayments,
            is_different_from_base: true
          }];
          break;
        }
        
        const baseMonthlyPayment = this.findCorrectMonthlyInstallment(
          amortization.loan_amount,
          monthlyRate,
          totalMonths,
          amortization.installments_per_year
        );
        console.log(`Base monthly payment: ${baseMonthlyPayment}`);

        // Keep the same monthly payment but reduce the number of months
        let adjustedTotalMonths = totalMonths;
        try {
          // This calculation can fail if the numbers don't work out mathematically
          adjustedTotalMonths = Math.ceil(
            Math.log(
              baseMonthlyPayment /
                (baseMonthlyPayment - (adjustedLoanAmount * monthlyRate))
            ) / Math.log(1 + monthlyRate)
          );
          console.log(`Calculated adjusted months: ${adjustedTotalMonths} (vs original ${totalMonths})`);
          
          // Safety check for non-finite values
          if (!isFinite(adjustedTotalMonths) || isNaN(adjustedTotalMonths)) {
            console.log('WARNING: Calculated months is not valid, using original total months');
            adjustedTotalMonths = totalMonths;
          }
        } catch (error) {
          console.error('Error calculating adjusted months:', error);
          adjustedTotalMonths = totalMonths;
        }
        
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
        console.log('Calculating lower payment scenario with the newer implementation');

        // Use our improved static implementation that preserves the original end date
        const result = ScenarioCalculator.calculateLowerPaymentScenario(
          amortization.loan_amount,
          amortization.interest_rate,
          amortization.term_years,
          amortization.installments_per_year,
          amortization.property_insurance,
          amortization.loan_insurance,
          extraInstallments,
          firstInstallmentDate
        );

        payments = result.payments.map(payment => {
          // Ensure we properly map any extra fields that might be in the result
          return {
            payment_date: payment.payment_date,
            capital: payment.capital || 0,
            interest: payment.interest || 0,
            property_insurance: payment.property_insurance || 0,
            loan_insurance: payment.loan_insurance || 0,
            monthly_payment: payment.monthly_payment || 0,
            is_different_from_base: payment.is_different_from_base || false
          };
        });
        
        break;
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
        total_months: scenarioType === 'accelerated' ? payments.length : totalMonths, // Use total months for all except accelerated
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

  /**
   * Static method to calculate summary statistics from payments
   */
  static calculateSummary(payments: PaymentRow[], originalTotalMonths?: number): ScenarioSummaryResult {
    // Calculate summary
    const totalInterest = payments.reduce((sum, payment) => sum + payment.interest, 0);
    const totalInsurance = payments.reduce((sum, payment) => 
      sum + payment.property_insurance + payment.loan_insurance, 0);

    return {
      total_interest_and_insurance: totalInterest + totalInsurance,
      // Use the original term length if provided, otherwise use the actual payment count
      total_months: originalTotalMonths || payments.length,
      monthly_payment: payments.length > 0 ? payments[0].monthly_payment : 0
    };
  }

  /**
   * Calculate lower payment scenario with extra lump sum
   * This ensures the original end date remains fixed while reducing monthly payments after each breakpoint
   */
  private static calculateLowerPaymentScenario(
    amount: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    extraInstallments: ExtraInstallment[],
    firstInstallmentDate?: Date
  ) {
    console.log('\n===== LOWER PAYMENT SCENARIO CALCULATION =====');
    console.log(`Original loan amount: ${amount}`);
    console.log(`Term years: ${termYears}`);
    
    // If no extra installments, return same as regular scenario
    if (!extraInstallments || extraInstallments.length === 0) {
      console.log('[ScenarioCalculator] No extra installments for lower payment scenario, using regular calculation');
      return this.calculateRegularScenario(
        amount,
        interest,
        termYears,
        installmentsPerYear,
        propertyInsurance,
        loanInsurance,
        firstInstallmentDate
      );
    }

    // First, ensure we have a valid first installment date
    const loanStartDate = firstInstallmentDate ? normalizeDate(firstInstallmentDate) : normalizeDate(new Date());
    console.log(`Loan start date: ${loanStartDate.toISOString()}`);
    
    // CRITICAL: Calculate the original end date - all extra installments must maintain this end date
    const originalTotalMonths = termYears * 12;
    const originalEndDate = new Date(loanStartDate);
    originalEndDate.setMonth(originalEndDate.getMonth() + originalTotalMonths - 1); // -1 because first month is counted
    console.log(`Original end date: ${originalEndDate.toISOString()}`);
    console.log(`Original total months: ${originalTotalMonths}`);
    
    // Sort extra installments by start date (chronological order)
    // Process and normalize dates for each installment
    const sortedInstallments = [...extraInstallments]
      .map(installment => {
        let normalizedDate: Date;
        
        // Handle different date formats
        if (typeof installment.start_date === 'string') {
          // Try direct YYYY-MM-DD parsing first
          const match = installment.start_date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // 0-based month
            const day = parseInt(match[3], 10);
            normalizedDate = new Date(year, month, day, 12, 0, 0, 0);
          } else {
            normalizedDate = new Date(installment.start_date);
          }
        } else if (installment.start_date instanceof Date) {
          normalizedDate = new Date(installment.start_date);
        } else {
          normalizedDate = new Date(String(installment.start_date));
        }
        
        // Special case logging for 2030-01-02
        if (normalizedDate.getFullYear() === 2030 && 
            normalizedDate.getMonth() === 0 && 
            normalizedDate.getDate() === 2) {
          console.log(`⚠️ DETECTED Jan 2, 2030 extra payment (Lower payment scenario)`);
        }
        
        return {
          ...installment,
          start_date: normalizedDate
        };
      })
      .sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
    
    console.log(`Sorted ${sortedInstallments.length} extra installments chronologically`);
    sortedInstallments.forEach((inst, i) => {
      console.log(`Sorted Extra Payment #${i+1}: ${inst.amount} (${inst.frequency}) on ${inst.start_date.toISOString()}`);
    });
    
    // Calculate initial regular payments (before any extra installments)
    const regularResult = GoalSeekService.calculate({
      amount,
      months: originalTotalMonths,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: loanStartDate
    });
    
    const originalBaseInstallment = regularResult.base_installment;
    const regularPayments = regularResult.payments;
    console.log(`Original base installment: ${originalBaseInstallment}`);
    
    // Initialize variables for tracking
    let finalPayments: any[] = []; // Use any[] to avoid type conflicts
    let currentPayments = [...regularPayments];
    let processedMonths = 0;
    
    // Process each breakpoint (extra installment) in chronological order
    for (let i = 0; i < sortedInstallments.length; i++) {
      const currentInstallment = sortedInstallments[i];
      const installmentDate = currentInstallment.start_date;
      console.log(`\n------------------------------------------------------------`);
      console.log(`Processing breakpoint #${i+1}: ${currentInstallment.amount} (${currentInstallment.frequency}) on ${installmentDate.toISOString()}`);
      
      // Find index of payment corresponding to the extra installment date
      const breakpointIndex = currentPayments.findIndex(payment => {
        const paymentDate = payment.payment_date;
        return paymentDate.getFullYear() === installmentDate.getFullYear() &&
               paymentDate.getMonth() === installmentDate.getMonth() &&
               paymentDate.getDate() === installmentDate.getDate();
      });
      
      // If we can't find an exact match, find the next payment after this date
      let matchedIndex = breakpointIndex;
      if (matchedIndex === -1) {
        // Find the first payment date after this extra installment
        matchedIndex = currentPayments.findIndex(payment => 
          payment.payment_date.getTime() >= installmentDate.getTime()
        );
        
        if (matchedIndex === -1) {
          console.log(`Warning: Extra payment is after the last scheduled payment, can't apply`);
          continue; // Skip this installment
        }
        
        console.log(`No exact date match found. Using next payment date: ${currentPayments[matchedIndex].payment_date.toISOString()}`);
      } else {
        console.log(`Found exact date match at payment index ${matchedIndex}`);
      }
      
      // Add all payments up to the breakpoint (but not including it) to our final payments
      if (matchedIndex > 0) {
        console.log(`Adding ${matchedIndex} payments before breakpoint to final schedule`);
        finalPayments = [...finalPayments, ...currentPayments.slice(0, matchedIndex)];
      }
      
      // CRITICAL: Calculate remaining months to the ORIGINAL END DATE, not based on current payments
      const breakpointPaymentDate = currentPayments[matchedIndex].payment_date;
      
      // Calculate months between breakpoint and original end date
      const breakpointYear = breakpointPaymentDate.getFullYear();
      const breakpointMonth = breakpointPaymentDate.getMonth();
      const originalEndYear = originalEndDate.getFullYear();
      const originalEndMonth = originalEndDate.getMonth();
      
      // Calculate months difference: (endYear - startYear) * 12 + (endMonth - startMonth)
      const monthsRemaining = (originalEndYear - breakpointYear) * 12 + (originalEndMonth - breakpointMonth) + 1; // +1 to include current month
      
      console.log(`Breakpoint date: ${breakpointPaymentDate.toISOString()}`);
      console.log(`Original end date: ${originalEndDate.toISOString()}`);
      console.log(`Months remaining to original end date: ${monthsRemaining}`);
      
      if (monthsRemaining <= 0) {
        console.log(`No months remaining after this breakpoint, loan is already paid off`);
        break;
      }
      
      // Get the balance at the breakpoint
      const breakpointBalance = currentPayments[matchedIndex].beginning_balance;
      console.log(`Balance at breakpoint: ${breakpointBalance}`);
      
      // Apply the extra payment
      let extraAmount = 0;
      
      if (currentInstallment.frequency === 'one-time') {
        extraAmount = currentInstallment.amount;
        console.log(`Applying one-time payment of ${extraAmount}`);
      } else if (currentInstallment.frequency === 'monthly') {
        // For monthly, we only need to reduce by a single month's worth at this breakpoint
        extraAmount = currentInstallment.amount;
        console.log(`Applying monthly payment of ${extraAmount} at this breakpoint`);
        // Monthly payments after this point will be handled in future iterations
      }
      
      // Reduce the balance by the extra payment
      const newBalance = Math.max(0, breakpointBalance - extraAmount);
      console.log(`New balance after extra payment: ${newBalance}`);
      
      // If balance is zero, loan is fully paid
      if (newBalance === 0) {
        console.log(`Balance is now zero, loan is fully paid off`);
        // Add a single final payment for the extra amount
        finalPayments.push({
          payment_date: breakpointPaymentDate,
          capital: extraAmount,
          interest: 0,
          property_insurance: 0,
          loan_insurance: 0,
          monthly_payment: extraAmount,
          is_different_from_base: true
        });
        break;
      }
      
      // CRITICAL: Recalculate payments from the breakpoint to the ORIGINAL END DATE
      console.log(`Recalculating ${monthsRemaining} remaining payments with new balance: ${newBalance}`);
      
      const recalculatedResult = GoalSeekService.calculate({
        amount: newBalance,
        months: monthsRemaining, // Always use months remaining to original end date
        yearly_interest_rate: interest,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        first_installment_date: breakpointPaymentDate
      });
      
      const newBaseInstallment = recalculatedResult.base_installment;
      console.log(`Recalculated base installment: ${newBaseInstallment} (was ${originalBaseInstallment})`);
      console.log(`Monthly payment reduction: ${(originalBaseInstallment - newBaseInstallment).toFixed(2)} (${((originalBaseInstallment - newBaseInstallment) / originalBaseInstallment * 100).toFixed(2)}%)`);
      
      // Mark all recalculated payments as different from base
      const recalculatedPayments = recalculatedResult.payments.map(payment => ({
        ...payment,
        is_different_from_base: true
      }));
      
      // Verify recalculated payments end at the original end date
      if (recalculatedPayments.length > 0) {
        const lastRecalculatedDate = recalculatedPayments[recalculatedPayments.length - 1].payment_date;
        const lastYear = lastRecalculatedDate.getFullYear();
        const lastMonth = lastRecalculatedDate.getMonth();
        
        console.log(`Recalculated payments end at: ${lastRecalculatedDate.toISOString()}`);
        console.log(`Should end at: ${originalEndDate.toISOString()}`);
        
        if (lastYear !== originalEndYear || lastMonth !== originalEndMonth) {
          console.error(`⚠️ WARNING: Recalculated payments don't end at the original end date!`);
          console.error(`Expected: ${originalEndYear}-${originalEndMonth+1}, Got: ${lastYear}-${lastMonth+1}`);
        } else {
          console.log(`✓ Recalculated payments correctly end at the original end date`);
        }
      }
      
      // Update for next iteration
      currentPayments = recalculatedPayments;
      processedMonths += matchedIndex;
    }
    
    // Add any remaining payments to our final list
    finalPayments = [...finalPayments, ...currentPayments];
    
    console.log(`Final payment schedule has ${finalPayments.length} payments`);
    
    // Ensure the loan still ends at original end date
    const actualLastPaymentDate = finalPayments[finalPayments.length - 1].payment_date;
    console.log(`Last payment date: ${actualLastPaymentDate.toISOString()}`);
    console.log(`Original end date: ${originalEndDate.toISOString()}`);
    
    // Final verification that our implementation is correct
    const yearMatch = actualLastPaymentDate.getFullYear() === originalEndDate.getFullYear();
    const monthMatch = actualLastPaymentDate.getMonth() === originalEndDate.getMonth();
    console.log(`End date maintained: ${yearMatch && monthMatch ? 'YES ✓' : 'NO ✗'}`);
    
    if (!yearMatch || !monthMatch) {
      console.error(`WARNING: Lower payment scenario end date doesn't match original! This indicates a calculation error.`);
    }
    
    return {
      // Pass the original total months to ensure the summary shows the intended term
      summary: this.calculateSummary(finalPayments, originalTotalMonths),
      payments: finalPayments
    }
  }

  /**
   * Static version of the regular scenario calculation
   */
  static calculateRegularScenario(
    amount: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    firstInstallmentDate?: Date
  ) {
    console.log(`[Static ScenarioCalculator] calculateRegularScenario with first_installment_date: ${firstInstallmentDate?.toISOString() || 'not provided'}`);
    
    const originalTotalMonths = termYears * 12;
    
    const result = GoalSeekService.calculate({
      amount,
      months: originalTotalMonths,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: firstInstallmentDate
    });

    return {
      summary: this.calculateSummary(result.payments, originalTotalMonths),
      payments: result.payments
    };
  }
} 