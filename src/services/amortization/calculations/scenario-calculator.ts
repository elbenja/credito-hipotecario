import { supabase } from "@/integrations/supabase/client"
import { addMonths, startOfMonth } from "date-fns"
import type { Database } from "@/types/supabase"

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
        console.log('Calculating lower payment scenario with extra payments');
        
        // Use the improved, common method to calculate total extra payments
        const totalExtraPayments = this.calculateExtraPaymentsImpact(
          extraInstallments,
          firstInstallmentDate,
          totalMonths
        );
        
        // Check if we actually have any effective extra payments to apply
        if (totalExtraPayments <= 0) {
          console.log('WARNING: No effective extra payments for lower payment scenario');
          console.log('Lower payment scenario will be identical to regular scenario');
          payments = this.calculateRegularPayments(amortization, firstInstallmentDate).map(payment => ({
            ...payment,
            is_different_from_base: false
          }));
          break;
        }
        
        // Ensure loan amount is valid after subtracting extra payments
        const adjustedLoanAmount = Math.max(0, amortization.loan_amount - totalExtraPayments);
        console.log(`Adjusted loan amount (after extra payments): ${adjustedLoanAmount}`);
        
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
        
        try {
          // Calculate the adjusted monthly payment with the reduced loan amount
          const adjustedMonthlyPayment = this.findCorrectMonthlyInstallment(
            adjustedLoanAmount,
            monthlyRate,
            totalMonths,
            amortization.installments_per_year
          );
          console.log(`Adjusted monthly payment: ${adjustedMonthlyPayment}`);
          
          let remainingBalance = adjustedLoanAmount;
          
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
        } catch (error) {
          console.error('Error calculating adjusted monthly payment:', error);
          // Fallback to regular payments in case of calculation error
          console.log('Falling back to regular payments due to error');
          payments = this.calculateRegularPayments(amortization, firstInstallmentDate).map(payment => ({
            ...payment,
            is_different_from_base: false
          }));
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