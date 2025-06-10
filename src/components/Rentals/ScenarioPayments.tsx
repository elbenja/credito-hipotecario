import React from "react";
import { useSavedScenarioPayments } from "@/hooks/mortgages/useSavedScenarioPayments";
import { 
  formatCurrency, 
  generateScenarioReport, 
  getPaymentsByYear,
  calculateScenarioTotals 
} from "@/utils/mortgage-scenario-utils";

interface SavedScenarioExampleProps {
  mortgageId: string;
}

/**
 * Example component demonstrating how to use the useSavedScenarioPayments hook
 * This shows various ways to work with the saved scenario data
 */
export const SavedScenarioExample: React.FC<SavedScenarioExampleProps> = ({ mortgageId }) => {
  const {
    scenarioResult,
    payments,
    summary,
    savedScenarioType,
    isLoading,
    error,
    hasSavedScenario
  } = useSavedScenarioPayments(mortgageId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading saved scenario...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error Loading Scenario</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  // Show no saved scenario state
  if (!hasSavedScenario || !scenarioResult || !payments || !summary) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold">No Saved Scenario</h3>
        <p className="text-yellow-600">This mortgage doesn't have a saved scenario yet.</p>
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
        <h2 className="text-2xl font-bold mb-4">
          Scenario: {savedScenarioType?.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Monthly Payment</h3>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(summary.monthly_payment)}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Total Months</h3>
            <p className="text-2xl font-bold text-green-900">
              {summary.total_months} <span className="text-sm">({(summary.total_months / 12).toFixed(1)} years)</span>
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Total Interest & Insurance</h3>
            <p className="text-2xl font-bold text-purple-900">
              {formatCurrency(summary.total_interest_and_insurance)}
            </p>
          </div>
        </div>

        {summary.breakeven_point && (
          <div className="mt-4 bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">Break-even Point</h3>
            <p className="text-lg text-orange-900">
              {summary.breakeven_point.toFixed(1)} years
            </p>
          </div>
        )}
      </div>

      {/* Payment Totals */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Payment Breakdown</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Payments</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.totalPayments)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Principal</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.totalPrincipal)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Interest</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.totalInterest)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Insurance</p>
            <p className="text-lg font-semibold">
              {formatCurrency(totals.totalPropertyInsurance + totals.totalLoanInsurance)}
            </p>
          </div>
        </div>
      </div>

      {/* All Payments */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">
          All Payments ({payments.length} payments)
        </h3>
        
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Payment</th>
                  <th className="px-4 py-2 text-right">Principal</th>
                  <th className="px-4 py-2 text-right">Interest</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">
                      {payment.payment_date.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(payment.monthly_payment)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(payment.principal || payment.capital)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(payment.monthly_interest || payment.interest)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {payment.ending_balance ? formatCurrency(payment.ending_balance) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No payments scheduled</p>
        )}
      </div>

      {/* Raw Data (for debugging) */}
      <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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
      </details>
    </div>
  );
};

export default SavedScenarioExample; 