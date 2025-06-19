export interface CalculationSource {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'equity';
  calculationType: 'fixed' | 'percentage_rent' | 'percentage_property';
  frequency: 'monthly' | 'annually' | 'one_time';
  baseValue?: number;
  percentage?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface MonthlyCalculationResult {
  date: Date;
  sources: Record<string, number>; // sourceId -> amount
  totalIncome: number;
  totalExpenses: number;
  totalEquity: number;
  netCashFlow: number;
  accumulatedIncome: number;
  accumulatedExpenses: number;
  accumulatedEquity: number;
  accumulatedNetFlow: number;
  propertyValue: number;
  equityPercentage: number;
}

export interface EquityCalculation {
  initialEquity: number;
  principalPayments: number;
  extraPayments: number;
  appreciation: number;
  totalEquity: number;
  equityPercentage: number;
}

export interface SimulationParameters {
  startDate: Date;
  durationInYears: number;
  totalMonths: number;
} 