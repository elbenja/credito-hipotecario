import { formatCurrency } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { ScenarioCalculator } from "@/services/amortization/services/scenarioCalculator"
import { useEffect, useState, useMemo, useCallback } from "react"

type ScenarioType = 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'

type PaymentSummaryProps = {
  totalInterestAndInsurance: number
  totalMonths: number
  monthlyPayment: number
  currency: "USD" | "PEN"
  scenarioType?: ScenarioType
  loanAmount?: number
  interestRate?: number
  termYears?: number
  installmentsPerYear?: number
  propertyInsurance?: number
  loanInsurance?: number
  firstInstallmentDate?: Date
  extraInstallments?: Array<{
    amount: number
    frequency: 'one-time' | 'monthly'
    start_date: Date | string
  }>
  rateChanges?: Array<{
    new_interest_rate: number
    new_term_years?: number
    effective_date: Date | string
  }>
  rateChangeInfo?: {
    effectiveDate: string
    newInterestRate: number
    newTermYears?: number
  }
}

export function PaymentSummary({
  totalInterestAndInsurance,
  totalMonths,
  monthlyPayment,
  currency,
  scenarioType = 'regular',
  loanAmount,
  interestRate,
  termYears,
  installmentsPerYear = 12,
  propertyInsurance = 0,
  loanInsurance = 0,
  firstInstallmentDate = new Date(),
  extraInstallments = [],
  rateChanges = [],
  rateChangeInfo
}: PaymentSummaryProps) {
  const { t } = useTranslation()
  
  // Memoize the initial summary
  const initialSummary = useMemo(() => ({
    totalInterestAndInsurance,
    totalMonths,
    monthlyPayment
  }), [totalInterestAndInsurance, totalMonths, monthlyPayment]);

  const [calculatedSummary, setCalculatedSummary] = useState(initialSummary);

  // Memoize the arrays and complex objects
  const memoizedExtraInstallments = useMemo(() => extraInstallments, [JSON.stringify(extraInstallments)]);
  const memoizedRateChanges = useMemo(() => rateChanges, [JSON.stringify(rateChanges)]);
  const memoizedFirstInstallmentDate = useMemo(() => {
    const date = new Date(firstInstallmentDate);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0, 0
    );
  }, [firstInstallmentDate]);

  // Memoize the calculation function
  const calculateScenario = useCallback(() => {
    // Log received values for debugging
    console.log('PaymentSummary Calculation Input:', {
      loanAmount,
      interestRate,
      termYears,
      installmentsPerYear,
      propertyInsurance,
      loanInsurance,
      firstInstallmentDate: memoizedFirstInstallmentDate.toISOString()
    });

    if (!loanAmount || !interestRate || !termYears || 
        isNaN(loanAmount) || isNaN(interestRate) || isNaN(termYears) ||
        loanAmount === 0) { // Add explicit check for zero loan amount
      console.log('Using initial summary due to invalid inputs');
      return initialSummary;
    }

    const scenarios = ScenarioCalculator.calculateScenarios({
      loan_amount: loanAmount,
      interest_rate: interestRate,
      term_years: termYears,
      installments_per_year: installmentsPerYear,
      first_installment_date: memoizedFirstInstallmentDate,
      property_insurance: propertyInsurance || 0,
      loan_insurance: loanInsurance || 0,
      extra_installments: memoizedExtraInstallments,
      rate_changes: memoizedRateChanges
    });

    console.log('Scenario Calculation Result:', {
      scenarioType,
      scenarios
    });

    const scenarioMap: Record<ScenarioType, keyof typeof scenarios> = {
      'regular': 'regular',
      'accelerated': 'accelerated',
      'lower_payment': 'lower_payment',
      'new_rate': 'new_rate'
    };

    const scenario = scenarios[scenarioMap[scenarioType]];
    if (!scenario) {
      console.log('No scenario found, using initial summary');
      return initialSummary;
    }

    const result = {
      totalInterestAndInsurance: scenario.summary.total_interest_and_insurance,
      totalMonths: scenario.summary.total_months,
      monthlyPayment: scenario.summary.monthly_payment
    };

    console.log('Calculation Result:', result);
    return result;
  }, [
    loanAmount,
    interestRate,
    termYears,
    installmentsPerYear,
    memoizedFirstInstallmentDate,
    propertyInsurance,
    loanInsurance,
    memoizedExtraInstallments,
    memoizedRateChanges,
    scenarioType,
    initialSummary
  ]);

  // Update summary when inputs change
  useEffect(() => {
    const newSummary = calculateScenario();
    setCalculatedSummary(newSummary);
  }, [calculateScenario]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-10 gap-4">
        <div className="col-span-5 grid gap-1">
          <div className="text-sm font-medium text-muted-foreground">
            {t("payment_summary.total_interest_insurance")}
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(calculatedSummary.totalInterestAndInsurance, currency)}
          </div>
        </div>
        <div className="col-span-2 grid gap-1">
          <div className="text-sm font-medium text-muted-foreground">
            {t("payment_summary.months")}
          </div>
          <div className="text-2xl font-bold">
            {calculatedSummary.totalMonths}
          </div>
        </div>
        <div className="col-span-3 grid gap-1">
          <div className="text-sm font-medium text-muted-foreground">
            {t("payment_summary.monthly_payment")}
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(calculatedSummary.monthlyPayment, currency)}
          </div>
        </div>
      </div>
      
      {rateChangeInfo && (
        <div className="bg-muted/40 p-3 rounded-md text-sm">
          <div className="font-medium mb-1">Rate Change Details:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground mr-1">Effective:</span>
              <span className="font-medium">
                {format(new Date(rateChangeInfo.effectiveDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">New Rate:</span>
              <span className="font-medium">{rateChangeInfo.newInterestRate}%</span>
            </div>
            {rateChangeInfo.newTermYears && (
              <div>
                <span className="text-muted-foreground mr-1">New Term:</span>
                <span className="font-medium">{rateChangeInfo.newTermYears} years</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 