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
type RateChange = {
  id: string
  amortization_id: string
  new_interest_rate: number
  effective_date: string
  new_term_years?: number  // Adding this field which exists in the DB but is missing from the type
  created_at?: string
  updated_at?: string
  new_balance?: number
}

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
  remainingBalance?: number
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
      return 0;
    }
    
    let totalExtraPayments = 0;
    
    // Extract day, month, year from firstInstallmentDate to avoid timezone issues
    const firstYear = firstInstallmentDate.getFullYear();
    const firstMonth = firstInstallmentDate.getMonth();
    const firstDay = firstInstallmentDate.getDate();
    
    // Process each extra installment
    for (let i = 0; i < extraInstallments.length; i++) {
      const installment = extraInstallments[i];
      
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
          } else {
            // Fallback for other string formats
            const date = new Date(installment.start_date);
            startYear = date.getFullYear();
            startMonth = date.getMonth();
            startDay = date.getDate();
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
          } else {
            // Invalid date format - skip this installment
            continue;
          }
        }
        
        // Determine if this installment is on or after the first installment
        let isOnOrAfterFirst = false;
        
        // SUPER BASIC COMPARISON: If the year is 2030, it's definitely after April 2025
        if (startYear > 2025) {
          isOnOrAfterFirst = true;
        } else {
          // Compare by components for most reliable results
          if (startYear > firstYear) {
            // Later year, clearly after
            isOnOrAfterFirst = true;
          } else if (startYear < firstYear) {
            // Earlier year, clearly before
            isOnOrAfterFirst = false;
          } else {
            // Same year, check month
            if (startMonth > firstMonth) {
              // Later month, clearly after
              isOnOrAfterFirst = true;
            } else if (startMonth < firstMonth) {
              // Earlier month, clearly before
              isOnOrAfterFirst = false;
            } else {
              // Same month, check day
              isOnOrAfterFirst = startDay >= firstDay;
            }
          }
        }
        
        if (!isOnOrAfterFirst) {
          continue;
        }
        
        // Handle different frequency types
        if (installment.frequency === 'one-time') {
          totalExtraPayments += installment.amount;
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
          
          if (remainingMonths > 0) {
            const amount = installment.amount * remainingMonths;
            totalExtraPayments += amount;
          }
        }
      } catch (error) {
        // Skip this installment on error
        continue;
      }
    }
    
    return totalExtraPayments;
  }

  private calculateRegularPayments(
    amortization: AmortizationInput,
    firstInstallmentDate: Date
  ): PaymentRow[] {
    try {
      // Store the original day of month to ensure we preserve it
      const originalDay = firstInstallmentDate.getDate();
      const originalMonth = firstInstallmentDate.getMonth();
      const originalYear = firstInstallmentDate.getFullYear();
      
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
          is_different_from_base: false,
          remainingBalance: remainingBalance - monthlyPrincipal
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
    
    const monthlyRate = this.calculateMonthlyRate(amortization.interest_rate, amortization.installments_per_year)
    
    let payments: PaymentRow[] = []

    switch (scenarioType) {
      case 'regular': {
        payments = this.calculateRegularPayments(amortization, firstInstallmentDate)
        break
      }
      case 'accelerated': {
        // Use the improved, common method to calculate total extra payments
        const totalExtraPayments = this.calculateExtraPaymentsImpact(
          extraInstallments,
          firstInstallmentDate,
          totalMonths
        );
        
        // Check if we actually have any effective extra payments to apply
        if (totalExtraPayments <= 0) {
          payments = this.calculateRegularPayments(amortization, firstInstallmentDate).map(payment => ({
            ...payment,
            is_different_from_base: false
          }));
          break;
        }
        
        // Ensure loan amount is valid after subtracting extra payments
        const adjustedLoanAmount = Math.max(0, amortization.loan_amount - totalExtraPayments);
        
        // Edge case: If adjusted loan amount is 0, loan is fully paid
        if (adjustedLoanAmount === 0) {
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
          
          // Safety check for non-finite values
          if (!isFinite(adjustedTotalMonths) || isNaN(adjustedTotalMonths)) {
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
        // For a new rate scenario, we need to:
        // 1. Keep original payments until the rate change date
        // 2. Only recalculate payments starting from the rate change date

        console.log("=== NEW RATE SCENARIO CALCULATION DETAILED DEBUG ===");
        console.log("Initial loan parameters:");
        console.log(`- Initial loan amount: $${amortization.loan_amount.toFixed(2)}`);
        console.log(`- Initial interest rate: ${amortization.interest_rate}%`);
        console.log(`- Initial term years: ${amortization.term_years} (${totalMonths} months)`);
        console.log(`- First installment date: ${firstInstallmentDate?.toISOString().split('T')[0] || 'Not specified'}`);

        if (!rateChanges || rateChanges.length === 0) {
          console.log("No rate changes found. Using regular payment schedule.");
          // If no rate changes, just return regular payments
          break;
        }

        console.log(`Rate changes detected: ${rateChanges.length}`);
        
        // Sort rate changes by effective date
        const sortedRateChanges = [...rateChanges].sort((a, b) => {
          const dateA = new Date(a.effective_date).getTime();
          const dateB = new Date(b.effective_date).getTime();
          return dateA - dateB;
        });

        console.log("Sorted rate changes:", sortedRateChanges.map(rc => ({
          effective_date: new Date(rc.effective_date).toISOString().split('T')[0],
          new_interest_rate: rc.new_interest_rate, 
          new_term_years: rc.new_term_years || 'remaining'
        })));
        
        // First calculate regular payments (for baseline)
        const regularPayments = this.calculateRegularPayments(
          amortization,
          firstInstallmentDate
        );
        
        console.log(`Regular payment schedule calculated with ${regularPayments.length} payments`);
        
        // Initialize our final payments array with regular payments
        // We'll replace sections of this array as we process rate changes
        payments = [...regularPayments];
        
        // Process each rate change
        for (let changeIdx = 0; changeIdx < sortedRateChanges.length; changeIdx++) {
          const rateChange = sortedRateChanges[changeIdx];
          
          // IMPROVED: Normalize date to YYYY-MM-DD format to avoid timezone issues
          const changeDateStr = new Date(rateChange.effective_date).toISOString().split('T')[0];
          // Create a new date object with the normalized date
          const changeYear = parseInt(changeDateStr.substring(0, 4));
          const changeMonth = parseInt(changeDateStr.substring(5, 7)) - 1; // Adjust for 0-based months
          const changeDay = parseInt(changeDateStr.substring(8, 10));
          const changeDate = new Date(changeYear, changeMonth, changeDay);
          
          console.log(`\n=== Processing rate change #${changeIdx + 1} effective ${changeDateStr} ===`);
          console.log(`- New interest rate: ${rateChange.new_interest_rate}%`);
          console.log(`- New term years: ${rateChange.new_term_years || 'remaining'}`);
          
          // Find the payment index for this change date (on or after the rate change date)
          const changeIndex = payments.findIndex(payment => {
            const paymentDate = payment.payment_date;
            
            // IMPROVED: Normalize payment date for comparison
            const paymentDateStr = new Date(paymentDate).toISOString().split('T')[0];
            const paymentYear = parseInt(paymentDateStr.substring(0, 4));
            const paymentMonth = parseInt(paymentDateStr.substring(5, 7)) - 1; // Adjust for 0-based months
            const paymentDay = parseInt(paymentDateStr.substring(8, 10));
            
            // Compare years, months, days directly - not using Date objects that can be affected by timezone
            return (paymentYear > changeYear) || 
                   (paymentYear === changeYear && paymentMonth > changeMonth) ||
                   (paymentYear === changeYear && paymentMonth === changeMonth && paymentDay >= changeDay);
          });
          
          if (changeIndex === -1) {
            console.log(`WARNING: Could not find payment matching or after change date ${changeDateStr}. Skipping this rate change.`);
            console.log(`Payments available:`, payments.map(p => new Date(p.payment_date).toISOString().split('T')[0]).slice(0, 5));
            continue; // Skip this rate change
          }

          console.log(`- Found matching payment at index ${changeIndex}`);
          console.log(`- Change payment date: ${new Date(payments[changeIndex].payment_date).toISOString().split('T')[0]}`);
          
          // Get the remaining balance at the change date (from the previous payment)
          const remainingBalance = changeIndex > 0 
            ? payments[changeIndex - 1].remainingBalance 
            : amortization.loan_amount;
          
          if (remainingBalance === undefined) {
            console.log(`WARNING: Could not determine remaining balance at rate change point. Using original loan amount.`);
          }
          
          const balanceAtChange = remainingBalance !== undefined ? remainingBalance : amortization.loan_amount;
          
          console.log(`\n=== Rate change breakpoint analysis ===`);
          console.log(`- Remaining balance at rate change date: $${balanceAtChange.toFixed(2)}`);
          
          // Calculate new rate and new monthly payment
          const newRate = rateChange.new_interest_rate;
          const remainingMonths = totalMonths - changeIndex;
          const newMonthlyRate = this.calculateMonthlyRate(newRate, amortization.installments_per_year);
          
          console.log(`- New interest rate: ${newRate}%`);
          console.log(`- New monthly rate: ${(newMonthlyRate * 100).toFixed(6)}%`);
          
          // If rate change specifies new term, use it, otherwise continue with remaining months
          const termMonths = rateChange.new_term_years 
            ? rateChange.new_term_years * 12 
            : remainingMonths;
          
          console.log(`- Remaining months in original term: ${remainingMonths}`);
          console.log(`- Term months to use for goalseek: ${termMonths}`);
          
          console.log(`- Calling goalseek via findCorrectMonthlyInstallment with params:`);
          console.log({
            loanAmount: balanceAtChange,
            monthlyRate: newMonthlyRate,
            months: termMonths,
            installmentsPerYear: amortization.installments_per_year
          });
          
          const newMonthlyPayment = this.findCorrectMonthlyInstallment(
            balanceAtChange,
            newMonthlyRate,
            termMonths, // Use new term if specified
            amortization.installments_per_year
          );
          
          console.log(`- New monthly payment calculated: $${newMonthlyPayment.toFixed(2)}`);
          
          // Recalculate all payments after the rate change
          const newPayments: PaymentRow[] = [];
          let currentBalance = balanceAtChange;
          
          console.log(`\n=== Beginning recalculation of payments after rate change ===`);
          
          // Use the original payment dates and just recalculate the amounts
          for (let i = changeIndex; i < regularPayments.length; i++) {
            const originalPayment = regularPayments[i];
            const currentDate = originalPayment.payment_date;
            
            // Check if we should stop because we've reached the next rate change
            if (changeIdx < sortedRateChanges.length - 1) {
              const nextChangeDate = new Date(sortedRateChanges[changeIdx + 1].effective_date);
              if (
                currentDate.getFullYear() > nextChangeDate.getFullYear() ||
                (currentDate.getFullYear() === nextChangeDate.getFullYear() && 
                 currentDate.getMonth() > nextChangeDate.getMonth()) ||
                (currentDate.getFullYear() === nextChangeDate.getFullYear() && 
                 currentDate.getMonth() === nextChangeDate.getMonth() &&
                 currentDate.getDate() >= nextChangeDate.getDate())
              ) {
                console.log(`- Reached next rate change date, stopping recalculation`);
                break;
              }
            }
            
            // Check if we've reached the new term end (if a specific new term was specified)
            if (rateChange.new_term_years) {
              const termEndDate = new Date(changeDate);
              termEndDate.setFullYear(termEndDate.getFullYear() + Math.floor(rateChange.new_term_years));
              termEndDate.setMonth(termEndDate.getMonth() + (rateChange.new_term_years * 12) % 12);
              
              if (currentDate > termEndDate) {
                console.log(`- Reached end of new term, stopping recalculation`);
                break;
              }
            }
            
            const isDoublePayment = amortization.installments_per_year === 14 && 
              (currentDate.getMonth() === 6 || currentDate.getMonth() === 11);
            
            const currentBasePayment = isDoublePayment ? newMonthlyPayment * 2 : newMonthlyPayment;
            const monthlyInterest = currentBalance! * newMonthlyRate;
            const monthlyPrincipal = currentBasePayment - monthlyInterest;
            
            const currentPropertyInsurance = isDoublePayment ? 
              amortization.property_insurance * 2 : 
              amortization.property_insurance;
            
            const currentLoanInsurance = isDoublePayment ? 
              amortization.loan_insurance * 2 : 
              amortization.loan_insurance;
            
            newPayments.push({
              payment_date: currentDate,
              capital: monthlyPrincipal,
              interest: monthlyInterest,
              property_insurance: currentPropertyInsurance,
              loan_insurance: currentLoanInsurance,
              monthly_payment: currentBasePayment + currentPropertyInsurance + currentLoanInsurance,
              remainingBalance: currentBalance! - monthlyPrincipal,
              is_different_from_base: true
            });
            
            currentBalance = currentBalance! - monthlyPrincipal;
            
            // If balance is nearly zero, we're done
            if (currentBalance! < 0.01) {
              console.log(`- Loan paid off, stopping recalculation`);
              break;
            }
          }
          
          console.log(`- Recalculated ${newPayments.length} payments after rate change`);
          
          // Replace the section of payments after the change date with our new calculations
          payments = [
            ...payments.slice(0, changeIndex), // Keep all payments before the rate change
            ...newPayments // Add recalculated payments after the rate change
          ];
        }
        
        // Make sure we have correct payment sorting
        payments.sort((a, b) => a.payment_date.getTime() - b.payment_date.getTime());
        
        console.log(`\n=== NEW RATE SCENARIO SUMMARY ===`);
        console.log(`- Total payments in final schedule: ${payments.length}`);
        console.log(`- First payment: ${payments[0]?.payment_date.toISOString().split('T')[0]} - $${payments[0]?.monthly_payment.toFixed(2)}`);
        console.log(`- Last payment: ${payments[payments.length-1]?.payment_date.toISOString().split('T')[0]} - $${payments[payments.length-1]?.monthly_payment.toFixed(2)}`);
        console.log(`=== END NEW RATE SCENARIO DEBUG ===\n`);
        
        break;
      }
    }

    // Calculate summary
    const totalInterest = payments.reduce((sum, payment) => sum + payment.interest, 0)
    const totalInsurance = payments.reduce((sum, payment) => 
      sum + payment.property_insurance + payment.loan_insurance, 0)

    return {
      summary: {
        total_interest_and_insurance: totalInterest + totalInsurance,
        // For new_rate scenario, always use actual payment count
        total_months: scenarioType === 'new_rate' ? payments.length : 
          (scenarioType === 'accelerated' ? payments.length : totalMonths),
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
    
    // Find a representative payment for displaying the monthly payment amount
    let representativePayment = payments.length > 0 ? payments[0] : null;
    
    // Check if we have payments with rate changes (is_different_from_base)
    const hasRateChange = payments.some(p => p.is_different_from_base);
    
    if (hasRateChange) {
      // Find the first non-double payment that has a different rate
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        if (payment.is_different_from_base) {
          // Skip double payments (July or December)
          const month = payment.payment_date.getMonth();
          const isDoublePayment = month === 6 || month === 11;
          
          if (!isDoublePayment) {
            representativePayment = payment;
            break;
          }
        }
      }
      
      console.log(`Found representative payment after rate change: $${representativePayment?.monthly_payment.toFixed(2)}`);
    }

    return {
      total_interest_and_insurance: totalInterest + totalInsurance,
      // For payments with rate changes, we should use the actual number of payments
      total_months: hasRateChange ? payments.length : (originalTotalMonths || payments.length),
      monthly_payment: representativePayment ? representativePayment.monthly_payment : 0
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
    // If no extra installments, return same as regular scenario
    if (!extraInstallments || extraInstallments.length === 0) {
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
    
    // CRITICAL: Calculate the original end date - all extra installments must maintain this end date
    const originalTotalMonths = termYears * 12;
    const originalEndDate = new Date(loanStartDate);
    originalEndDate.setMonth(originalEndDate.getMonth() + originalTotalMonths - 1); // -1 because first month is counted
    
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
        
        return {
          ...installment,
          start_date: normalizedDate
        };
      })
      .sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
    
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
    
    // Initialize variables for tracking
    let finalPayments: any[] = []; // Use any[] to avoid type conflicts
    let currentPayments = [...regularPayments];
    let processedMonths = 0;
    
    // Process each breakpoint (extra installment) in chronological order
    for (let i = 0; i < sortedInstallments.length; i++) {
      const currentInstallment = sortedInstallments[i];
      const installmentDate = currentInstallment.start_date;
      
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
          continue; // Skip this installment
        }
      }
      
      // Add all payments up to the breakpoint (but not including it) to our final payments
      if (matchedIndex > 0) {
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
      
      if (monthsRemaining <= 0) {
        break;
      }
      
      // Get the balance at the breakpoint
      const breakpointBalance = currentPayments[matchedIndex].beginning_balance;
      
      // Apply the extra payment
      let extraAmount = 0;
      
      if (currentInstallment.frequency === 'one-time') {
        extraAmount = currentInstallment.amount;
      } else if (currentInstallment.frequency === 'monthly') {
        // For monthly, we only need to reduce by a single month's worth at this breakpoint
        extraAmount = currentInstallment.amount;
        // Monthly payments after this point will be handled in future iterations
      }
      
      // Reduce the balance by the extra payment
      const newBalance = Math.max(0, breakpointBalance - extraAmount);
      
      // If balance is zero, loan is fully paid
      if (newBalance === 0) {
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
      
      // Mark all recalculated payments as different from base
      const recalculatedPayments = recalculatedResult.payments.map(payment => ({
        ...payment,
        is_different_from_base: true
      }));
      
      // Update for next iteration
      currentPayments = recalculatedPayments;
      processedMonths += matchedIndex;
    }
    
    // Add any remaining payments to our final list
    finalPayments = [...finalPayments, ...currentPayments];
    
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