import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/utils/utils";
import { Badge } from "../ui/badge";
import { PaymentRow, ScenarioResult } from "@/types/common";

interface ExtraInstallment {
  id: string;
  mortgage_id: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  created_at?: string;
  updated_at?: string;
}

interface LiveScenarioPaymentsProps {
  scenario: ScenarioResult;
  extraInstallments: ExtraInstallment[];
  scenarioType: string;
}

/**
 * Component for displaying live scenario payment data (not from database)
 * This shows payment data directly from calculations in memory
 */
export const LiveScenarioPayments: React.FC<LiveScenarioPaymentsProps> = ({ 
  scenario, 
  extraInstallments, 
  scenarioType 
}) => {
  const { t, i18n } = useTranslation('rentals');
  
  const payments = scenario?.payments || [];
  const summary = scenario?.summary;

  // Helper function to find extra installment for a specific payment date
  const getExtraInstallmentForDate = (paymentDate: Date | string) => {
    const date = typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate;
    return extraInstallments.find(extra => {
      const paymentMonth = date.getMonth();
      const paymentYear = date.getFullYear();
      const extraDate = new Date(extra.start_date + 'T12:00:00Z') ;
      // fix fucking date console.log('extraDate', extraDate , extra.start_date) ;
      const extraMonth = extraDate.getMonth();
      const extraYear = extraDate.getFullYear();
      return paymentMonth === extraMonth && paymentYear === extraYear;
    });
  };

  // Calculate totals from payment data
  const totals = useMemo(() => {
    if (!payments.length) {
      return {
        totalPayments: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        totalPropertyInsurance: 0,
        totalLoanInsurance: 0
      };
    }

    return payments.reduce((acc, payment) => {
      return {
        totalPayments: acc.totalPayments + (payment.monthly_payment || 0),
        totalPrincipal: acc.totalPrincipal + (payment.principal || payment.capital || 0),
        totalInterest: acc.totalInterest + (payment.monthly_interest || payment.interest || 0),
        totalPropertyInsurance: acc.totalPropertyInsurance + (payment.property_insurance || 0),
        totalLoanInsurance: acc.totalLoanInsurance + (payment.monthly_loan_insurance || payment.loan_insurance || 0)
      };
    }, {
      totalPayments: 0,
      totalPrincipal: 0,
      totalInterest: 0,
      totalPropertyInsurance: 0,
      totalLoanInsurance: 0
    });
  }, [payments]);

  // Show no data state
  if (!scenario || !summary || !payments.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold">{t('scenario_payments.no_scenario.title')}</h3>
        <p className="text-yellow-600">{t('scenario_payments.no_scenario.description')}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Scenario Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <span className="text-md">{t('scenario_payments.overview.title')} </span> 
          <span className="font-bold bg-brand text-black px-2 py-0 rounded-md">
            {scenarioType ? t(`scenario_payments.scenario_types.${scenarioType}` as any) : scenarioType?.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}
          </span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg">
            <h3 className="text-xs">{t('scenario_payments.overview.total_interest_insurance')}</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.total_interest_and_insurance)}
            </p>
          </div>

          <div className="p-4 rounded-lg">
            <h3 className="text-xs">{t('scenario_payments.overview.total_months')}</h3>
            <p className="text-2xl font-bold">
              {summary.total_months} <span className="text-sm">({(summary.total_months / 12).toFixed(1)} {t('scenario_payments.overview.years_suffix')})</span>
            </p>
          </div>
          
          <div className="p-4 rounded-lg">
            <h3 className="text-xs">{t('scenario_payments.overview.monthly_payment')}</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.monthly_payment)}
            </p>
          </div>
        </div>

        {summary.breakeven_point && (
          <div className="flex items-center justify-center mt-4 bg-muted p-2 rounded-lg gap-4">
            <span className="font-semibold">{t('scenario_payments.overview.breakeven_point')}</span>
            <span className="text-lg">
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
                  const paymentDate = typeof payment.payment_date === 'string' 
                    ? new Date(payment.payment_date) 
                    : payment.payment_date;
                  const extraInstallment = getExtraInstallmentForDate(paymentDate);
                  
                  return (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2 text-xs text-center">
                        
                        {(() => {
                          const dateStr = paymentDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { 
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
                          <Badge variant="green" className="text-xs xl:text-sm whitespace-nowrap">
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

      <div className="text-sm rounded-lg p-6">
        {t('scenario_payments.footer')}
      </div>
    </div>
  );
};

export default LiveScenarioPayments; 