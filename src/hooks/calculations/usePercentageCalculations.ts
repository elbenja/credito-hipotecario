import { useMemo } from 'react';
import type { CalculationSource, MonthlyCalculationResult, SimulationParameters } from '@/types/calculations';

interface PercentageCalculationParams {
  source: CalculationSource;
  simulationParams: SimulationParameters;
  currentPropertyValue?: number; // For calculations that depend on current property value
}

export const usePercentageCalculations = (params: PercentageCalculationParams[]) => {
  return useMemo(() => {
    if (!params || params.length === 0) return [];

    const results: MonthlyCalculationResult[] = [];

    // Calculate simulation months array
    const { startDate, totalMonths } = params[0]?.simulationParams || {};
    if (!startDate || !totalMonths) return [];

    const monthlyDates = Array.from({ length: totalMonths }, (_, index) => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + index);
      return date;
    });

    // Process each month
    monthlyDates.forEach((currentDate, monthIndex) => {
      const monthlyResult: MonthlyCalculationResult = {
        date: currentDate,
        sources: {},
        totalIncome: 0,
        totalExpenses: 0,
        totalEquity: 0,
        netCashFlow: 0,
        accumulatedIncome: 0,
        accumulatedExpenses: 0,
        accumulatedEquity: 0,
        accumulatedNetFlow: 0,
        propertyValue: 0,
        equityPercentage: 0,
      };

      // Process each calculation source for this month
      params.forEach(({ source, currentPropertyValue }) => {
        let monthlyAmount = 0;

        if (source.calculationType === 'percentage_property' && source.percentage && source.baseValue) {
          // Calculate effective monthly rate from annual percentage
          const annualRate = source.percentage / 100;
          // Using standard monthly compounding formula
          const monthlyRate = Math.pow(1 + annualRate, 1/12) - 1;
          
          // For property appreciation, we need to compound the value
          if (source.type === 'equity' && source.frequency === 'monthly') {
            if (monthIndex === 0) {
              // First month: base property value
              monthlyAmount = source.baseValue;
            } else {
              // Get previous month's property value and apply monthly appreciation
              const previousResult = results[monthIndex - 1];
              const previousPropertyValue = previousResult?.propertyValue || source.baseValue;
              monthlyAmount = previousPropertyValue * (1 + monthlyRate);
            }
            
            // Store the appreciated property value
            monthlyResult.propertyValue = monthlyAmount;
            
            // The equity contribution is the monthly appreciation amount
            if (monthIndex > 0) {
              const previousPropertyValue = results[monthIndex - 1]?.propertyValue || source.baseValue;
              monthlyAmount = monthlyAmount - previousPropertyValue; // Only the appreciation for this month
            } else {
              monthlyAmount = 0; // No appreciation in first month
            }
          }
        } else if (source.calculationType === 'fixed' && source.baseValue) {
          // Fixed amount calculations
          if (source.frequency === 'one_time' && monthIndex === 0) {
            monthlyAmount = source.baseValue;
          } else if (source.frequency === 'monthly') {
            monthlyAmount = source.baseValue;
          } else if (source.frequency === 'annually' && monthIndex % 12 === 0) {
            monthlyAmount = source.baseValue;
          }
        }

        // Store the calculated amount for this source
        monthlyResult.sources[source.id] = monthlyAmount;

        // Add to appropriate totals based on source type
        switch (source.type) {
          case 'income':
            monthlyResult.totalIncome += monthlyAmount;
            break;
          case 'expense':
            monthlyResult.totalExpenses += monthlyAmount;
            break;
          case 'equity':
            monthlyResult.totalEquity += monthlyAmount;
            break;
        }
      });

      // Calculate net cash flow
      monthlyResult.netCashFlow = monthlyResult.totalIncome - monthlyResult.totalExpenses;

      // Calculate accumulated values
      const previousResult = results[monthIndex - 1];
      if (previousResult) {
        monthlyResult.accumulatedIncome = previousResult.accumulatedIncome + monthlyResult.totalIncome;
        monthlyResult.accumulatedExpenses = previousResult.accumulatedExpenses + monthlyResult.totalExpenses;
        monthlyResult.accumulatedEquity = previousResult.accumulatedEquity + monthlyResult.totalEquity;
        monthlyResult.accumulatedNetFlow = previousResult.accumulatedNetFlow + monthlyResult.netCashFlow;
      } else {
        monthlyResult.accumulatedIncome = monthlyResult.totalIncome;
        monthlyResult.accumulatedExpenses = monthlyResult.totalExpenses;
        monthlyResult.accumulatedEquity = monthlyResult.totalEquity;
        monthlyResult.accumulatedNetFlow = monthlyResult.netCashFlow;
      }

      // Calculate equity percentage (if property value exists)
      if (monthlyResult.propertyValue > 0 && monthlyResult.accumulatedEquity > 0) {
        monthlyResult.equityPercentage = (monthlyResult.accumulatedEquity / monthlyResult.propertyValue) * 100;
      }

      results.push(monthlyResult);
    });

    return results;
  }, [params]);
};

// Helper function to create property appreciation calculation source
export const createPropertyAppreciationSource = (
  propertyId: string,
  initialValue: number,
  annualAppreciationRate: number,
  startDate: Date
): CalculationSource => ({
  id: `property-appreciation-${propertyId}`,
  name: 'Property Appreciation',
  type: 'equity',
  calculationType: 'percentage_property',
  frequency: 'monthly',
  baseValue: initialValue,
  percentage: annualAppreciationRate,
  startDate,
});

// Helper function to create initial equity calculation source
export const createInitialEquitySource = (
  propertyId: string,
  initialEquity: number,
  startDate: Date
): CalculationSource => ({
  id: `initial-equity-${propertyId}`,
  name: 'Initial Equity (Down Payment)',
  type: 'equity',
  calculationType: 'fixed',
  frequency: 'one_time',
  baseValue: initialEquity,
  startDate,
}); 