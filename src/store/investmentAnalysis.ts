import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CalculationSource, MonthlyCalculationResult } from '@/types/calculations';

interface InvestmentAnalysisState {
  // Core data
  activeCalculations: CalculationSource[];
  monthlyResults: MonthlyCalculationResult[];
  
  // UI State
  selectedTimeRange: { start: Date; end: Date } | null;
  selectedPropertyId: string | null;
  selectedMortgageId: string | null;
  propertyAnnualAppreciation: number;
  
  // Table Configuration
  visibleColumns: string[];
  isTableExpanded: boolean;
  
  // Loading states
  isCalculating: boolean;
  lastCalculatedAt: Date | null;
  
  // Actions
  setActiveCalculations: (calculations: CalculationSource[]) => void;
  addCalculation: (calculation: CalculationSource) => void;
  removeCalculation: (id: string) => void;
  updateCalculation: (id: string, updates: Partial<CalculationSource>) => void;
  
  setMonthlyResults: (results: MonthlyCalculationResult[]) => void;
  clearResults: () => void;
  
  setSelectedProperty: (propertyId: string | null) => void;
  setSelectedMortgage: (mortgageId: string | null) => void;
  setPropertyAnnualAppreciation: (rate: number) => void;
  
  setSelectedTimeRange: (range: { start: Date; end: Date } | null) => void;
  
  // Table actions
  setVisibleColumns: (columns: string[]) => void;
  toggleColumn: (columnId: string) => void;
  setTableExpanded: (expanded: boolean) => void;
  
  // Calculation actions
  setCalculating: (calculating: boolean) => void;
  markCalculated: () => void;
  
  // Computed getters
  getCalculationById: (id: string) => CalculationSource | undefined;
  getFilteredResults: (start?: Date, end?: Date) => MonthlyCalculationResult[];
  getSummaryMetrics: () => {
    totalIncome: number;
    totalExpenses: number;
    totalEquity: number;
    netCashFlow: number;
    finalPropertyValue: number;
  };
}

export const useInvestmentAnalysisStore = create<InvestmentAnalysisState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeCalculations: [],
      monthlyResults: [],
      selectedTimeRange: null,
      selectedPropertyId: null,
      selectedMortgageId: null,
      propertyAnnualAppreciation: 2,
      visibleColumns: ['date', 'totalIncome', 'totalExpenses', 'totalEquity', 'netCashFlow'],
      isTableExpanded: false,
      isCalculating: false,
      lastCalculatedAt: null,

      // Core calculation actions
      setActiveCalculations: (calculations) =>
        set(
          { activeCalculations: calculations, lastCalculatedAt: new Date() },
          false,
          'setActiveCalculations'
        ),

      addCalculation: (calculation) =>
        set(
          (state) => ({
            activeCalculations: [...state.activeCalculations, calculation],
            lastCalculatedAt: new Date(),
          }),
          false,
          'addCalculation'
        ),

      removeCalculation: (id) =>
        set(
          (state) => ({
            activeCalculations: state.activeCalculations.filter((calc) => calc.id !== id),
            lastCalculatedAt: new Date(),
          }),
          false,
          'removeCalculation'
        ),

      updateCalculation: (id, updates) =>
        set(
          (state) => ({
            activeCalculations: state.activeCalculations.map((calc) =>
              calc.id === id ? { ...calc, ...updates } : calc
            ),
            lastCalculatedAt: new Date(),
          }),
          false,
          'updateCalculation'
        ),

      // Results actions
      setMonthlyResults: (results) =>
        set({ monthlyResults: results }, false, 'setMonthlyResults'),

      clearResults: () =>
        set(
          { monthlyResults: [], lastCalculatedAt: null },
          false,
          'clearResults'
        ),

      // Selection actions
      setSelectedProperty: (propertyId) =>
        set({ selectedPropertyId: propertyId }, false, 'setSelectedProperty'),

      setSelectedMortgage: (mortgageId) =>
        set({ selectedMortgageId: mortgageId }, false, 'setSelectedMortgage'),

      setPropertyAnnualAppreciation: (rate) =>
        set({ propertyAnnualAppreciation: rate }, false, 'setPropertyAnnualAppreciation'),

      setSelectedTimeRange: (range) =>
        set({ selectedTimeRange: range }, false, 'setSelectedTimeRange'),

      // Table configuration actions
      setVisibleColumns: (columns) =>
        set({ visibleColumns: columns }, false, 'setVisibleColumns'),

      toggleColumn: (columnId) =>
        set(
          (state) => ({
            visibleColumns: state.visibleColumns.includes(columnId)
              ? state.visibleColumns.filter((col) => col !== columnId)
              : [...state.visibleColumns, columnId],
          }),
          false,
          'toggleColumn'
        ),

      setTableExpanded: (expanded) =>
        set({ isTableExpanded: expanded }, false, 'setTableExpanded'),

      // Calculation state actions
      setCalculating: (calculating) =>
        set({ isCalculating: calculating }, false, 'setCalculating'),

      markCalculated: () =>
        set({ lastCalculatedAt: new Date() }, false, 'markCalculated'),

      // Computed getters
      getCalculationById: (id) => {
        const state = get();
        return state.activeCalculations.find((calc) => calc.id === id);
      },

      getFilteredResults: (start, end) => {
        const state = get();
        if (!start && !end) return state.monthlyResults;

        return state.monthlyResults.filter((result) => {
          const resultDate = new Date(result.date);
          if (start && resultDate < start) return false;
          if (end && resultDate > end) return false;
          return true;
        });
      },

      getSummaryMetrics: () => {
        const state = get();
        const results = state.monthlyResults;
        
        if (results.length === 0) {
          return {
            totalIncome: 0,
            totalExpenses: 0,
            totalEquity: 0,
            netCashFlow: 0,
            finalPropertyValue: 0,
          };
        }

        const lastResult = results[results.length - 1];
        return {
          totalIncome: lastResult.accumulatedIncome,
          totalExpenses: lastResult.accumulatedExpenses,
          totalEquity: lastResult.accumulatedEquity,
          netCashFlow: lastResult.accumulatedNetFlow,
          finalPropertyValue: lastResult.propertyValue,
        };
      },
    }),
    {
      name: 'investment-analysis-store',
    }
  )
); 