# 📊 Property Investment Analysis: Architecture & Code Organization

 Here's the architecture I recommend:

## **1. Core Architecture Overview**

### **Data Flow:**
```
Mortgage Data → Calculation Engines → Monthly Normalization → Zustand Store → Dynamic Table & Charts
```

### **Detailed Flow:**
1. **Mortgage Data** feeds into **Calculation Engines**
2. **Calculation Engines** process and normalize data into **Monthly Results**
3. **Monthly Results** are stored in **Zustand Store** (central state management)
4. **Dynamic Table** reads from **Zustand Store**
5. **Charts/Visualizations** read from **Zustand Store**

### **Key Components Structure:**

## **2. Calculation System**

### **A. Individual Calculation Hooks**
You'll need specialized calculation hooks for different income/expense types:

```typescript
// /src/hooks/calculations/
├── useMortgageCalculations.ts     // Extract data from your mortgage JSON
├── useRentalIncomeCalculations.ts // Monthly rental income calculations
├── usePercentageCalculations.ts   // Percentage-based calculations
├── useFixedCostCalculations.ts    // Fixed monthly/annual costs
├── useOperatingExpenses.ts        // Property maintenance, insurance, etc.
└── useCalculationEngine.ts        // Main orchestrator
```

### **B. Calculation Types Interface**
```typescript
// /src/types/calculations.ts
interface CalculationSource {
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

interface MonthlyCalculationResult {
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

interface EquityCalculation {
  initialEquity: number;
  principalPayments: number;
  extraPayments: number;
  appreciation: number;
  totalEquity: number;
  equityPercentage: number;
}
```

## **3. Dynamic Table System**

### **A. Table Component Structure**
```typescript
// /src/components/investment-analysis/
├── DynamicInvestmentTable.tsx     // Main table component
├── ColumnManager.tsx              // Add/remove columns dynamically
├── CalculationColumn.tsx          // Individual calculation column
├── SummaryColumns.tsx             // Income/Expense totals
└── TableControls.tsx              // Table configuration controls
```

### **B. Table State Management**
```typescript
// /src/store/investmentAnalysis.ts (using Zustand or similar)
interface InvestmentAnalysisState {
  activeCalculations: CalculationSource[];
  monthlyResults: MonthlyCalculationResult[];
  selectedTimeRange: { start: Date; end: Date };
  
  // Actions
  addCalculation: (calculation: CalculationSource) => void;
  removeCalculation: (id: string) => void;
  updateCalculation: (id: string, updates: Partial<CalculationSource>) => void;
  recalculateAll: () => void;
}
```

## **4. Mortgage Data Integration**

### **A. Mortgage Data Processor**
```typescript
// /src/utils/mortgageProcessor.ts
interface MortgageDataProcessor {
  extractMonthlyPayments(mortgageData: any): MonthlyPayment[];
  createMortgageCalculationSources(mortgageData: any): CalculationSource[];
  normalizePaymentSchedule(payments: any[]): MonthlyCalculationResult[];
}
```

### **B. Mortgage Calculation Hook**
```typescript
// /src/hooks/calculations/useMortgageCalculations.ts
export const useMortgageCalculations = (mortgageData: any) => {
  return useMemo(() => {
    return {
      monthlyPayment: CalculationSource;
      propertyInsurance: CalculationSource;
      loanInsurance: CalculationSource;
      // Extract other mortgage-related expenses
    };
  }, [mortgageData]);
};
```

## **5. Chart/Visualization System**

### **A. Chart Components**
```typescript
// /src/components/charts/
├── AccumulationChart.tsx          // Main accumulation chart
├── CashFlowChart.tsx             // Monthly cash flow visualization
├── BreakdownChart.tsx            // Income/expense breakdown
└── ComparisonChart.tsx           // Compare different scenarios
```

### **B. Chart Data Processing**
```typescript
// /src/hooks/useChartData.ts
export const useChartData = (monthlyResults: MonthlyCalculationResult[]) => {
  return useMemo(() => ({
    accumulationData: // Process for accumulation chart
    monthlyFlowData: // Process for cash flow chart
    breakdownData: // Process for breakdown visualization
  }), [monthlyResults]);
};
```

## **6. Component Implementation Plan**

### **Phase 1: Core Calculation Engine**
1. Create base calculation types and interfaces
2. Implement mortgage data processor
3. Build individual calculation hooks
4. Create main calculation orchestrator

### **Phase 2: Dynamic Table System**
1. Build base table component
2. Implement column management system
3. Add calculation result display
4. Create table controls and configuration

### **Phase 3: Visualization Layer**
1. Implement accumulation chart
2. Add monthly cash flow visualization
3. Create interactive controls
4. Build export/sharing functionality

## **7. Specific Calculation Examples**

### **Income Sources:**
- **Rental Income**: Fixed monthly amount with annual increases
- **Tax Benefits**: Percentage calculations

### **Equity Sources:**
- **Initial Equity**: Down payment (initial contribution)
- **Principal Payments**: From monthly mortgage installments
- **Extra Payments**: Additional principal prepayments
- **Property Appreciation**: Percentage-based on property value (moved from Income to Equity)

### **Expense Sources:**
- **Mortgage Payment**: From your mortgage data
- **Property Insurance**: From mortgage data
- **Operating Expenses**: Fixed monthly amounts
- **Maintenance**: Percentage of rent or property value
- **Property Management**: Percentage of rent

## **8. Calculation Types Interface**
```typescript
// /src/types/calculations.ts
interface CalculationSource {
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

interface MonthlyCalculationResult {
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

interface EquityCalculation {
  initialEquity: number;
  principalPayments: number;
  extraPayments: number;
  appreciation: number;
  totalEquity: number;
  equityPercentage: number;
}
```

## **9. Equity Calculation System**

### **A. Equity Calculation Hook**
```typescript
// /src/hooks/calculations/useEquityCalculations.ts
export const useEquityCalculations = (mortgageData: any, propertyData: any) => {
  return useMemo(() => {
    return {
      initialEquity: CalculationSource;
      principalPayments: CalculationSource;
      extraPayments: CalculationSource;
      appreciation: CalculationSource;
    };
  }, [mortgageData, propertyData]);
};
```

### **B. Equity Tracking Components**
```typescript
// /src/components/investment-analysis/
├── EquityBreakdown.tsx          // Shows equity components
├── EquityGrowthChart.tsx        // Visualizes equity growth over time
└── EquityMetrics.tsx            // Displays key equity metrics
```

## **10. File Structure Recommendation**

```
/src/
├── components/
│   ├── investment-analysis/
│   │   ├── DynamicInvestmentTable/
│   │   ├── CalculationManager/
│   │   └── charts/
├── hooks/
│   ├── calculations/
│   └── useInvestmentAnalysis.ts
├── utils/
│   ├── calculationEngine.ts
│   ├── mortgageProcessor.ts
│   └── dateUtils.ts
├── types/
│   ├── calculations.ts
│   ├── mortgage.ts
│   └── investment.ts
└── store/
    └── investmentAnalysis.ts
```



---





## Appendix . **Calculation Logic: Hooks vs. Utils**

### **Calculations in `utils/`**

- **What:** Pure, stateless functions for calculations and data transformations.
- **Where:** `src/utils/`
- **Why:** These functions are reusable, testable, and not tied to React. They can be used anywhere in the codebase (hooks, services, tests, etc.).
- **Example:** `calculateMonthlyPayments(mortgageData)`

```typescript
// src/utils/mortgageProcessor.ts
export function calculateMonthlyPayments(mortgageData) {
  // ...pure calculation logic...
  return monthlyPaymentsArray;
}
```

---

### **Calculations in `hooks/`**

- **What:** React hooks that manage state, memoization, and side effects, often using utility functions.
- **Where:** `src/hooks/calculations/`
- **Why:** Hooks integrate calculation logic with React's lifecycle, making results available to components in an optimized way.
- **Example:** `useMortgageCalculations(mortgageData)`

```typescript
// src/hooks/calculations/useMortgageCalculations.ts
import { calculateMonthlyPayments } from '../../utils/mortgageProcessor';

export function useMortgageCalculations(mortgageData) {
  return useMemo(() => calculateMonthlyPayments(mortgageData), [mortgageData]);
}
```

---

### **Summary Table**

| Folder   | Purpose                        | React-Aware | State/Effects | Example Use Case                |
|----------|-------------------------------|-------------|---------------|---------------------------------|
| hooks/   | Integrate calculations with React | Yes         | Yes           | `useMortgageCalculations`       |
| utils/   | Pure calculation logic         | No          | No            | `calculateMonthlyPayments`      |



- **Put all pure, reusable logic in `utils/`.**
- **Use hooks in `hooks/` to connect those utilities to React components,** manage state, and optimize performance with memoization.

---

**This separation keeps your codebase clean, testable, and easy to maintain!**

---

**End of Document**