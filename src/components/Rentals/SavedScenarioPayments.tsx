import React from "react";
import { useTranslation } from "react-i18next";
import { useSavedScenarioPayments } from "@/hooks/mortgages/useSavedScenarioPayments";
import { useMortgageBundle } from "@/hooks/useMortgageBundle";
import { useExtraInstallmentsFromBundle } from "@/hooks/mortgages/useExtraInstallmentsFromBundle";
import { 
  formatCurrency, 
  generateScenarioReport, 
  getPaymentsByYear,
  calculateScenarioTotals 
} from "@/utils/mortgage-scenario-utils";
import { Badge } from "../ui/badge";

interface SavedScenarioExampleProps {
  mortgageId: string;
}

/**
 * Example component demonstrating how to use the useSavedScenarioPayments hook
 * This shows various ways to work with the saved scenario data
 */
export const SavedScenario: React.FC<SavedScenarioExampleProps> = ({ mortgageId }) => {
  const { t, i18n } = useTranslation('rentals');
  
  const {
    scenarioResult,
    payments,
    summary,
    savedScenarioType,
    isLoading,
    error,
    hasSavedScenario
  } = useSavedScenarioPayments(mortgageId);

  // Get the mortgage bundle and extract extra installments
  const { data: bundle } = useMortgageBundle(mortgageId);
  const extraInstallments = useExtraInstallmentsFromBundle(bundle);

  // Helper function to find extra installment for a specific payment date
  const getExtraInstallmentForDate = (paymentDate: Date) => {
    return extraInstallments.find(extra => {
      const paymentMonth = paymentDate.getMonth();
      const paymentYear = paymentDate.getFullYear();
      const extraMonth = extra.start_date.getMonth();
      const extraYear = extra.start_date.getFullYear();
      return paymentMonth === extraMonth && paymentYear === extraYear;
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">{t('scenario_payments.loading')}</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">{t('scenario_payments.error.title')}</h3>
        <p className="text-red-600">{t('scenario_payments.error.description', { message: error.message })}</p>
      </div>
    );
  }

  // Show no saved scenario state
  if (!hasSavedScenario || !scenarioResult || !payments || !summary) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold">{t('scenario_payments.no_scenario.title')}</h3>
        <p className="text-yellow-600">{t('scenario_payments.no_scenario.description')}</p>
      </div>
    );
  }

  // Calculate additional data
  const totals = calculateScenarioTotals(payments);
  const currentYear = new Date().getFullYear();
  const thisYearPayments = getPaymentsByYear(payments, currentYear);
  
  return (
    <div className="space-y-6">
      {/* Scenario Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <span className="text-md">{t('scenario_payments.overview.title')} </span> 
          <span className="font-bold bg-brand text-black px-2 py-0 rounded-md">
            {savedScenarioType ? t(`scenario_payments.scenario_types.${savedScenarioType}` as any) : savedScenarioType?.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}
          </span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          
        
          
          <div className=" p-4 rounded-lg">
            <h3 className="text-xs  ">{t('scenario_payments.overview.total_interest_insurance')}</h3>
            <p className="text-2xl font-bold ">
              {formatCurrency(summary.total_interest_and_insurance)}
            </p>
          </div>

          <div className="p-4 rounded-lg">
            <h3 className="text-xs  ">{t('scenario_payments.overview.total_months')}</h3>
            <p className="text-2xl font-bold">
              {summary.total_months} <span className="text-sm">({(summary.total_months / 12).toFixed(1)} {t('scenario_payments.overview.years_suffix')})</span>
            </p>
          </div>
          <div className=" p-4 rounded-lg">
            <h3 className="text-xs  ">{t('scenario_payments.overview.monthly_payment')}</h3>
            <p className="text-2xl font-bold ">
              {formatCurrency(summary.monthly_payment)}
            </p>
          </div>

        </div>

        {summary.breakeven_point && (
          <div className="flex  items-center justify-center mt-4 bg-muted p-2 rounded-lg gap-4">
            <span className="font-semibold ">{t('scenario_payments.overview.breakeven_point')}</span>
            <span className="text-lg ">
              {summary.breakeven_point.toFixed(1)} {t('scenario_payments.overview.years_suffix')}
            </span>
          </div>
        )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mt-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('scenario_payments.payment_breakdown.total_payments')}</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalPayments)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('scenario_payments.payment_breakdown.total_principal')}</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalPrincipal)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('scenario_payments.payment_breakdown.total_interest')}</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalInterest)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('scenario_payments.payment_breakdown.total_insurance')}</p>
              <p className="text-lg font-semibold">
                {formatCurrency(totals.totalPropertyInsurance + totals.totalLoanInsurance)}
              </p>
          </div>
        </div>
      </div>

      {/* Payment Totals */}
      {/* <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-4">Payment Breakdown</h3>
        
      
      </div> */}

      {/* All Payments */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">
          {t('scenario_payments.payments_table.title')} ({t('scenario_payments.payments_table.payments_count', { count: payments.length })})
        </h3>
        
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-2 font-semibold text-sm text-center">{t('scenario_payments.payments_table.headers.date')}</th>
                  <th className="px-4 py-2 font-semibold text-sm text-right">{t('scenario_payments.payments_table.headers.payment')}</th>
                  <th className="px-4 py-2 font-semibold text-sm text-right">{t('scenario_payments.payments_table.headers.principal')}</th>
                  <th className="px-4 py-2 font-semibold text-sm text-right">{t('scenario_payments.payments_table.headers.interest')}</th>
                  <th className="px-4 py-2 font-semibold text-sm text-right">{t('scenario_payments.payments_table.headers.extra_installments')}</th>
                  <th className="px-4 py-2 font-semibold text-sm text-right">{t('scenario_payments.payments_table.headers.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => {
                  const extraInstallment = getExtraInstallmentForDate(payment.payment_date);
                  return (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2 text-xs text-center">
                        {(() => {
                          const dateStr = payment.payment_date.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { 
                            month: 'short',
                            year: 'numeric'
                          });
                          // Capitalize first letter for Spanish months
                          if (i18n.language === 'es') {
                            return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
                          }
                          return dateStr;
                        })()}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(payment.monthly_payment)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(payment.principal || payment.capital)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(payment.monthly_interest || payment.interest)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {extraInstallment ? (
                          // <span className="font-medium text-green-600">
                          //   {formatCurrency(extraInstallment.amount)}
                          // </span>
                          <Badge variant="green"  className="text-xs xl:text-sm whitespace-nowrap">
                            {formatCurrency(extraInstallment.amount)}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-right">
                        {payment.ending_balance ? formatCurrency(payment.ending_balance) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">{t('scenario_payments.payments_table.no_payments')}</p>
        )}
      </div>

      {/* Raw Data (for debugging) */}
      {/* <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold">
          Debug: Raw Data ({payments.length} payments)
        </summary>
        <pre className="mt-4 text-xs overflow-x-auto">
          {JSON.stringify({ 
            savedScenarioType, 
            summary, 
            firstPayment: payments[0],
            lastPayment: payments[payments.length - 1] 
          }, null, 2)}
        </pre>
      </details> */}
      <div className="  text-sm  rounded-lg p-6">
        {t('scenario_payments.footer')}
      </div>
    </div>
  );
};

export default SavedScenario; 