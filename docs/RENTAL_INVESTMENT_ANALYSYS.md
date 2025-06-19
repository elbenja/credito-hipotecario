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

### **A. Simulation Parameters**
```typescript
// /src/types/simulation.ts
interface SimulationParameters {
  startDate: Date;  // First installment date from mortgage or today's date
  durationInYears: number;  // Fixed at 25 years
  totalMonths: number;  // Calculated as durationInYears * 12
}

// /src/hooks/useSimulationParameters.ts
export const useSimulationParameters = (mortgageData?: any) => {
  return useMemo(() => {
    const startDate = mortgageData?.first_installment_date 
      ? new Date(mortgageData.first_installment_date)
      : new Date(); // Today's date if no mortgage data
    
    return {
      startDate,
      durationInYears: 25,
      totalMonths: 25 * 12
    };
  }, [mortgageData]);
};
```

### **B. Individual Calculation Hooks**
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

## **3. Currency Handling**

### **A. Currency Conversion System**
```typescript
// /src/utils/currencyConverter.ts
interface CurrencyConverter {
  convertToPEN(amount: number, fromCurrency: 'USD' | 'PEN'): number;
  getExchangeRate(fromCurrency: 'USD' | 'PEN'): number;
}

// /src/hooks/useCurrencyConversion.ts
export const useCurrencyConversion = () => {
  return {
    convertToPEN: (amount: number, fromCurrency: 'USD' | 'PEN') => {
      if (fromCurrency === 'PEN') return amount;
      const rate = getExchangeRate('USD');
      return amount * rate;
    },
    getExchangeRate: (fromCurrency: 'USD' | 'PEN') => {
      // Fetch current exchange rate from a reliable API
      // Consider caching the rate for a short period
      return fetchExchangeRate(fromCurrency);
    }
  };
};
```

### **B. Currency Integration**
- All monetary values in the system will be stored in PEN (Peruvian Sol)
- When properties or mortgages are in USD:
  1. The system will automatically convert all values to PEN using the current exchange rate
  2. The original USD values will be preserved for reference
  3. All calculations and displays will use the PEN values
  4. Exchange rates will be updated periodically to ensure accuracy

## **4. Dynamic Table System**

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

## **5. Mortgage Data Integration**

### **A. Existing Mortgage Hooks**
The system can leverage existing mortgage hooks for data extraction:

```typescript
// Available hooks for mortgage data processing
import { useSavedScenarioPayments } from "@/hooks/mortgages/useSavedScenarioPayments";
import { useMortgageBundle } from "@/hooks/useMortgageBundle";
import { useExtraInstallmentsFromBundle } from "@/hooks/mortgages/useExtraInstallmentsFromBundle";

// Payment data structure from useSavedScenarioPayments
interface MortgagePayment {
  payment_date: string;           // ISO date string
  beginning_balance: number;      // Loan balance at start of period
  monthly_payment: number;        // Total monthly payment amount
  monthly_interest: number;       // Interest portion of payment
  property_insurance: number;     // Property insurance amount
  monthly_loan_insurance: number; // Loan insurance (PMI) amount
  principal: number;              // Principal portion of payment
  ending_balance: number;         // Loan balance at end of period
  is_different_from_base: boolean; // Indicates if payment differs from base scenario
}
```

### **B. Extra Installments & Scenarios**
For scenarios with accelerated payments or lower payments, use the bundle hooks:

```typescript
// /src/hooks/calculations/useMortgageWithScenarios.ts
export const useMortgageWithScenarios = (mortgageId: string, scenarioType?: string) => {
  const mortgageBundle = useMortgageBundle(mortgageId);
  const savedPayments = useSavedScenarioPayments(mortgageId, scenarioType);
  const extraInstallments = useExtraInstallmentsFromBundle(mortgageBundle);
  
  return useMemo(() => {
    return {
      monthlyPayments: savedPayments,        // All monthly payments with scenario adjustments
      extraInstallments: extraInstallments,  // Additional payments for 'accelerated' scenarios
      hasScenarioAdjustments: savedPayments?.some(p => p.is_different_from_base),
      totalExtraPayments: extraInstallments?.reduce((sum, extra) => sum + extra.amount, 0) || 0
    };
  }, [savedPayments, extraInstallments, mortgageBundle]);
};
```

### **C. Integration with Investment Analysis**
```typescript
// /src/hooks/calculations/useMortgageCalculations.ts
export const useMortgageCalculations = (mortgageId: string, scenarioType?: string) => {
  const mortgageData = useMortgageWithScenarios(mortgageId, scenarioType);
  
  return useMemo(() => {
    if (!mortgageData.monthlyPayments) return [];
    
    return mortgageData.monthlyPayments.map(payment => ({
      // Convert mortgage payment to CalculationSource format
      monthlyPayment: {
        id: 'mortgage-payment',
        name: 'Monthly Mortgage Payment',
        type: 'expense' as const,
        amount: payment.monthly_payment,
        date: new Date(payment.payment_date)
      },
      propertyInsurance: {
        id: 'property-insurance',
        name: 'Property Insurance',
        type: 'expense' as const,
        amount: payment.property_insurance,
        date: new Date(payment.payment_date)
      },
      loanInsurance: {
        id: 'loan-insurance',
        name: 'Loan Insurance (PMI)',
        type: 'expense' as const,
        amount: payment.monthly_loan_insurance,
        date: new Date(payment.payment_date)
      },
      principalPayment: {
        id: 'principal-payment',
        name: 'Principal Payment',
        type: 'equity' as const,
        amount: payment.principal,
        date: new Date(payment.payment_date)
      }
    }));
  }, [mortgageData]);
};
```

### **D. Mortgage Data Processor**
```typescript
// /src/utils/mortgageProcessor.ts
interface MortgageDataProcessor {
  extractMonthlyPayments(mortgageData: any): MonthlyPayment[];
  createMortgageCalculationSources(mortgageData: any): CalculationSource[];
  normalizePaymentSchedule(payments: any[]): MonthlyCalculationResult[];
}
```

## **6. Chart/Visualization System**

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

## **7. Component Implementation Plan**

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

## **8. Specific Calculation Examples**

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

## **9. Calculation Types Interface**
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

## **10. Equity Calculation System**

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

## **11. File Structure Recommendation**

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