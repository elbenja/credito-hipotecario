# Saved Scenario Payments Implementation

This implementation provides a complete solution for retrieving and working with saved mortgage scenario payments.

## Files Created

### 1. `src/hooks/useSavedScenarioPayments.ts`
The main hook that:
- Uses `useMortgageBundle` to get mortgage data
- Transforms the data to match `ScenarioCalculator` input
- Calculates the saved scenario payments
- Returns payments, summary, and metadata

### 2. `src/utils/mortgage-scenario-utils.ts`
Utility functions for working with scenario data:
- Currency formatting
- Payment breakdown analysis
- Scenario comparisons
- Data validation
- Report generation

### 3. `src/components/examples/SavedScenarioExample.tsx`
Example component showing how to use the hook

## Usage

### Basic Usage

```tsx
import { useSavedScenarioPayments } from "@/hooks/useSavedScenarioPayments";

function MyComponent({ mortgageId }) {
  const { 
    payments, 
    summary, 
    savedScenarioType, 
    isLoading, 
    error 
  } = useSavedScenarioPayments(mortgageId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!payments) return <div>No saved scenario</div>;

  return (
    <div>
      <h2>Scenario: {savedScenarioType}</h2>
      <p>Monthly Payment: {summary?.monthly_payment}</p>
      <p>Total Payments: {payments.length}</p>
    </div>
  );
}
```

### Advanced Usage with Utilities

```tsx
import { useSavedScenarioPayments } from "@/hooks/useSavedScenarioPayments";
import { 
  formatCurrency, 
  calculateScenarioTotals,
  getPaymentsByYear 
} from "@/utils/mortgage-scenario-utils";

function AdvancedComponent({ mortgageId }) {
  const { payments, summary, scenarioResult } = useSavedScenarioPayments(mortgageId);
  
  if (!payments || !summary) return null;
  
  const totals = calculateScenarioTotals(payments);
  const thisYear = getPaymentsByYear(payments, 2025);
  
  return (
    <div>
      <h3>Total Interest: {formatCurrency(totals.totalInterest)}</h3>
      <h3>Payments this year: {thisYear.length}</h3>
    </div>
  );
}
```

## API Reference

### `useSavedScenarioPayments(mortgageId)`

**Returns:**
```typescript
{
  scenarioResult: ScenarioResult | null;     // Full scenario with payments & summary
  payments: PaymentRow[] | null;             // Just the payments array
  summary: ScenarioSummaryResult | null;     // Summary statistics
  savedScenarioType: string | null;          // Type: 'regular', 'accelerated', etc.
  isLoading: boolean;                        // Loading state
  error: Error | null;                       // Error state
  hasSavedScenario: boolean;                 // Whether mortgage has saved scenario
}
```

### Utility Functions

- `formatCurrency(amount, currency)` - Format currency for display
- `calculateScenarioTotals(payments)` - Get totals for all payments
- `getPaymentsByYear(payments, year)` - Filter payments by year
- `getPaymentBreakdown(payment)` - Get normalized payment data
- `compareScenarios(scenario1, scenario2)` - Compare two scenarios
- `generateScenarioReport(bundle, scenario)` - Generate full report

## Data Flow

1. **Input**: Mortgage ID
2. **`useMortgageBundle`**: Fetches mortgage data from database
3. **`transformMortgageBundleToCalculateInput`**: Converts to calculator format
4. **`ScenarioCalculator.calculateScenarios`**: Calculates all scenarios
5. **Select saved scenario**: Returns the specific saved scenario type
6. **Output**: Payments, summary, and metadata

## Error Handling

The hook handles several error cases:
- Invalid mortgage ID
- Missing mortgage data
- Invalid saved scenario type
- Calculation errors
- Network errors

## Performance

- Uses `useMemo` to prevent unnecessary recalculations
- Inherits caching from `useMortgageBundle` (30-second stale time)
- Only calculates when mortgage bundle data changes

## Type Safety

All functions are fully typed with TypeScript, including:
- Input validation
- Null safety checks
- Proper return types
- Interface definitions

## Integration Notes

- Builds on existing `useMortgageBundle` hook
- Uses existing `ScenarioCalculator` service  
- Compatible with existing `PaymentRow` and `ScenarioResult` types
- Handles both old and new field name variations (e.g., `capital`/`principal`)

## Testing

To test the implementation:

1. Use a mortgage ID that has a saved scenario
2. Check the example component: `<SavedScenarioExample mortgageId="your-id" />`
3. Verify payments array has correct length and values
4. Confirm summary matches database values

## Future Enhancements

Potential improvements:
- Add caching for calculated scenarios
- Support for comparing multiple scenarios
- Export functionality for payments
- Integration with charting libraries
- Real-time updates when scenarios change 