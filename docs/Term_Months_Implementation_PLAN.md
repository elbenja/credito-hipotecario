# Term Months Implementation Plan

## Overview
This document outlines the comprehensive plan for implementing `term_months` support in our mortgage application while maintaining backward compatibility with existing `term_years` data.

## 📋 Requirements Summary

### User Interface
- **Input**: Single text field with 1 decimal precision (e.g., "20.5 years")
- **Display**: Always show in years format (e.g., "20.5 years")
- **Future Enhancement**: PopOver component for year/month selection

### Data Strategy
- **New mortgages**: Use `term_months` only
- **Existing mortgages**: Keep `term_years` as fallback
- **Priority Logic**: `term_months` first, fallback to `term_years * 12`

### Validation Rules
- **Minimum**: 5 years (60 months)
- **Maximum**: 30 years (360 months)
- **Previous Range**: 10-25 years (now expanded to 5-30 years)

---

## 🗂️ Implementation Phases

### Phase 1: Database Schema Changes
**Estimated Time**: 1-2 days

#### 1.1 Database Migration
Create migration file: `supabase/migrations/YYYYMMDD_add_term_months.sql`

```sql
-- Add term_months column to amortizations table (backing table for mortgages view)
ALTER TABLE amortizations 
ADD COLUMN term_months INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN amortizations.term_months IS 'Loan term in months for enhanced precision';

-- Create index for performance
CREATE INDEX idx_amortizations_term_months ON amortizations(term_months);
```

#### 1.2 Update Database Types
**File**: `src/integrations/supabase/types.ts`
- Add `term_months: number | null` to amortizations table Row/Insert/Update interfaces
- Update mortgages view to include term_months

**Validation**: Test with existing mortgages view to ensure backward compatibility

---

### Phase 2: Type System Updates
**Estimated Time**: 1 day

#### 2.1 Core Type Definitions
**Files to Update**:

1. **`src/types/mortgage.ts`**
   ```typescript
   export type Mortgage = {
     // ... existing fields
     term_years: number;
     term_months?: number | null; // New field
     // ... rest of fields
   }
   ```

2. **`src/types/common.ts`**
   ```typescript
   export interface BaseAmortizationValues {
     // ... existing fields
     term_years: number;
     term_months?: number | null; // New field
     // ... rest of fields
   }

   export interface MortgageFormValues {
     // ... existing fields
     term_years: number | string;
     term_months?: number | string; // New field
     // ... rest of fields
   }
   ```

#### 2.2 Utility Functions
**New File**: `src/utils/term-conversion.ts`
```typescript
export interface TermData {
  months: number;
  years: number;
  displayYears: string; // e.g., "20.5"
}

export const convertTermToMonths = (years: number): number => {
  return Math.round(years * 12);
}

export const convertMonthsToYears = (months: number): number => {
  return Number((months / 12).toFixed(1));
}

export const getEffectiveTermMonths = (
  termMonths?: number | null, 
  termYears?: number
): number => {
  // Priority: term_months first, fallback to term_years * 12
  if (termMonths !== null && termMonths !== undefined) {
    return termMonths;
  }
  return termYears ? termYears * 12 : 240; // Default 20 years
}

export const formatTermDisplay = (months: number): string => {
  return convertMonthsToYears(months).toFixed(1);
}
```

---

### Phase 3: Form Schema and Validation Updates
**Estimated Time**: 1 day

#### 3.1 Update Mortgage Form Schema
**File**: `src/components/mortgages/schema.ts`

```typescript
// Update validation rules
export const mortgageFormSchema = z.object({
  // ... existing fields
  
  // Keep term_years for backward compatibility
  term_years: z.string().min(1, "amortization_form.validation.required"),
  
  // Add term_months validation
  term_months: z.string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true; // Optional field
        const months = parseInt(value);
        return !isNaN(months) && months >= 60 && months <= 360;
      },
      "Term must be between 5 and 30 years (60-360 months)"
    ),
})

// Update default values
export const defaultValues: MortgageFormValues = {
  // ... existing fields
  term_years: "20",
  term_months: "240", // 20 years in months
  // ... rest of fields
}
```

#### 3.2 Add Validation Translations
**Files**: 
- `src/i18n/locales/en/mortgages.json`
- `src/i18n/locales/es/mortgages.json`

```json
{
  "amortization": {
    "validation": {
      "term_months_min": "Term must be at least 5 years (60 months)",
      "term_months_max": "Term cannot exceed 30 years (360 months)",
      "term_months_invalid": "Please enter a valid number of months"
    }
  }
}
```

---

### Phase 4: UI Component Updates
**Estimated Time**: 2-3 days

#### 4.1 Update Mortgage Details Form
**File**: `src/components/mortgages/mortgage-details-form.tsx`

Current term_years dropdown will be replaced with:

```tsx
// Replace the existing term_years field with a decimal years input
<FormField
  control={form.control}
  name="term_years"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('amortization.term', { ns: 'mortgages' })}</FormLabel>
      <FormControl>
        <Input
          type="number"
          step="0.1"
          min="5"
          max="30"
          placeholder="20"
          {...field}
          onChange={(e) => {
            const years = parseFloat(e.target.value);
            field.onChange(e.target.value);
            
            // Auto-calculate term_months when years change
            if (!isNaN(years)) {
              const months = convertTermToMonths(years);
              form.setValue("term_months", months.toString());
            }
          }}
        />
      </FormControl>
      <FormDescription>
        {t('amortization.term_description', { ns: 'mortgages' })}
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

// Hidden field for term_months (will be used for calculations)
<FormField
  control={form.control}
  name="term_months"
  render={({ field }) => (
    <input type="hidden" {...field} />
  )}
/>
```

#### 4.2 Update Display Components
**Files to Update**:
1. **`src/components/mortgages/columns.tsx`** - Table columns
2. **`src/components/dashboard/property-cards.tsx`** - Property card displays
3. **`src/components/amortizations/payment-schedule.tsx`** - Payment schedule

**Pattern for Display**:
```tsx
// Use utility function for consistent display
const displayTerm = (mortgage: Mortgage) => {
  const months = getEffectiveTermMonths(mortgage.term_months, mortgage.term_years);
  return `${formatTermDisplay(months)} years`;
}
```

#### 4.3 Update Drafts and Form State
**File**: `src/hooks/useMortgageDraft.ts`

```typescript
const transformToFormValues = (mortgage: Mortgage): MortgageFormValues => {
  const effectiveMonths = getEffectiveTermMonths(mortgage.term_months, mortgage.term_years);
  const displayYears = convertMonthsToYears(effectiveMonths);
  
  return {
    // ... existing fields
    term_years: displayYears.toFixed(1),
    term_months: effectiveMonths.toString(),
    // ... rest of fields
  };
}
```

---

### Phase 5: Calculation Engine Updates
**Estimated Time**: 3-4 days

#### 5.1 Update Core Calculation Classes
**Files to Update**:

1. **`src/utils/calculations/mortgage/loan.ts`**
   ```typescript
   export class LoanCalculator {
     calculateMonthlyPayment(
       loanAmount: number,
       annualRate: number,
       termMonths: number, // Changed from termYears
       installmentsPerYear: number
     ): number {
       // Update logic to work with months directly
       const totalPayments = (termMonths / 12) * installmentsPerYear;
       // ... rest of calculation
     }

     generatePaymentSchedule(
       loanAmount: number,
       baseValues: BaseAmortizationValuesWithMonths, // New interface
       property: Property
     ): PaymentDetail[] {
       const effectiveMonths = getEffectiveTermMonths(
         baseValues.term_months, 
         baseValues.term_years
       );
       const totalPayments = (effectiveMonths / 12) * baseValues.installments_per_year;
       // ... rest of logic
     }
   }
   ```

2. **`src/utils/calculations/mortgage/scenarioCalculator.ts`**
   ```typescript
   interface CalculateInput {
     loan_amount: number;
     interest_rate: number;
     term_months: number; // Changed from term_years
     installments_per_year: number;
     // ... rest of fields
   }

   export class ScenarioCalculator {
     static calculateScenarios(input: CalculateInput): Scenarios {
       const totalMonths = input.term_months;
       // Update all scenario calculations to use months
     }
   }
   ```

3. **`src/utils/calculations/mortgage/goalSeek.ts`**
4. **`src/utils/calculations/mortgage/fixedPayments.ts`**

#### 5.2 Update Service Layer
**Files to Update**:
1. **`src/services/amortization/calculations/amortizationData.ts`**
2. **`src/services/mortgages/mortgage-capture-service.ts`**

**Pattern**: Replace all `termYears` calculations with months-based logic using the utility functions.

---

### Phase 6: Service and Hook Updates
**Estimated Time**: 2-3 days

#### 6.1 Update Mortgage Hooks
**Files to Update**:
1. **`src/hooks/mortgages/useAdd.ts`**
2. **`src/hooks/mortgages/useUpdate.ts`**
3. **`src/hooks/useMortgageBundle.ts`**
4. **`src/hooks/use-scenario-calculations.ts`**

**Pattern**: Ensure all service calls include term_months and use the priority logic.

#### 6.2 Update Page Components
**Files to Update**:
1. **`src/pages/NewMortgage.tsx`**
2. **`src/pages/EditMortgage.tsx`**

```typescript
// Example for NewMortgage.tsx
const handleFormSubmit = async (values: MortgageFormValues) => {
  const termYears = parseFloat(values.term_years);
  const termMonths = convertTermToMonths(termYears);
  
  const mortgageData = {
    // ... existing fields
    term_years: termYears,
    term_months: termMonths, // New field
    // ... rest of fields
  };
  
  // Update scenario calculation call
  const scenarios = ScenarioCalculator.calculateScenarios({
    // ... existing fields
    term_months: termMonths, // Use months for calculations
    // ... rest of fields
  });
}
```

---

### Phase 7: Data Migration Strategy
**Estimated Time**: 1 day

#### 7.1 Gradual Migration Approach
**No automatic data migration** - new mortgages will use `term_months`, existing ones keep `term_years`.

#### 7.2 Migration Utility (Optional)
**New File**: `src/utils/migration/term-migration.ts`

```typescript
// Optional utility for manual migration if needed later
export const migrateTermToMonths = async (supabase: any) => {
  // Query mortgages without term_months
  const { data: mortgages } = await supabase
    .from('mortgages')
    .select('id, term_years')
    .is('term_months', null);
  
  // Update each record
  for (const mortgage of mortgages || []) {
    const termMonths = convertTermToMonths(mortgage.term_years);
    await supabase
      .from('mortgages')
      .update({ term_months: termMonths })
      .eq('id', mortgage.id);
  }
};
```

---

### Phase 8: Testing Strategy
**Estimated Time**: 2-3 days

#### 8.1 Unit Tests
**New File**: `src/utils/__tests__/term-conversion.test.ts`

```typescript
describe('Term Conversion Utilities', () => {
  test('converts years to months correctly', () => {
    expect(convertTermToMonths(20)).toBe(240);
    expect(convertTermToMonths(20.5)).toBe(246);
  });

  test('gets effective term months with priority', () => {
    expect(getEffectiveTermMonths(246, 20)).toBe(246); // term_months takes priority
    expect(getEffectiveTermMonths(null, 20)).toBe(240); // fallback to term_years
  });
});
```

#### 8.2 Integration Tests
**Files to Update**:
1. **`src/pages/tests/TestCalculator.tsx`** - Add term_months test scenarios
2. **`src/components/mortgages/__tests__/`** - Add form validation tests

#### 8.3 Manual Testing Checklist
- [ ] Create new mortgage with decimal years (e.g., 20.5)
- [ ] Verify calculations use months correctly
- [ ] Test backward compatibility with existing mortgages
- [ ] Verify display formatting in all UI components
- [ ] Test form validation (5-30 year range)
- [ ] Test edge cases (5.0, 30.0, invalid inputs)

---

### Phase 9: Documentation Updates
**Estimated Time**: 1 day

#### 9.1 Update Developer Documentation
**File**: `docs/TERM_MONTHS_GUIDE.md` (new file)

```markdown
# Term Months Implementation Guide

## Overview
This document explains how term duration is handled in the mortgage system.

## Field Priority
1. `term_months` (primary) - Used for all new mortgages
2. `term_years` (fallback) - Used for existing mortgages without term_months

## Utility Functions
- `getEffectiveTermMonths()` - Gets the effective term in months
- `convertTermToMonths()` - Converts years to months
- `formatTermDisplay()` - Formats months for display as years

## Best Practices
- Always use `getEffectiveTermMonths()` in calculations
- Display terms using `formatTermDisplay()`
- Store new mortgages with `term_months`
```

#### 9.2 Update User Documentation
**Files**: Update any user-facing documentation to reflect the expanded term range (5-30 years).

---

## 🎯 Implementation Timeline

### Week 1
- **Day 1-2**: Phase 1 (Database Schema)
- **Day 3**: Phase 2 (Type System)
- **Day 4**: Phase 3 (Form Schema)
- **Day 5**: Phase 4 Start (UI Components)

### Week 2
- **Day 1-2**: Phase 4 Complete (UI Components)
- **Day 3-4**: Phase 5 Start (Calculation Engine)
- **Day 5**: Phase 5 Continue

### Week 3
- **Day 1**: Phase 5 Complete (Calculation Engine)
- **Day 2-3**: Phase 6 (Services and Hooks)
- **Day 4**: Phase 7 (Migration Strategy)
- **Day 5**: Phase 8 Start (Testing)

### Week 4
- **Day 1-2**: Phase 8 Complete (Testing)
- **Day 3**: Phase 9 (Documentation)
- **Day 4-5**: Bug fixes and final polish

---

## 🚨 Risk Mitigation

### Backward Compatibility Risks
- **Risk**: Breaking existing mortgages that only have `term_years`
- **Mitigation**: Always use `getEffectiveTermMonths()` utility function
- **Testing**: Comprehensive testing with existing data

### Calculation Accuracy Risks
- **Risk**: Rounding errors in year/month conversions
- **Mitigation**: Use consistent rounding rules (Math.round for months)
- **Testing**: Unit tests for edge cases

### UI/UX Risks
- **Risk**: User confusion with decimal year input
- **Mitigation**: Clear labeling and examples in UI
- **Future**: PopOver component for intuitive year/month selection

### Performance Risks
- **Risk**: Additional database queries for term_months
- **Mitigation**: Database indexes and efficient queries
- **Testing**: Performance testing with large datasets

---

## 🔄 Future Enhancements

### Phase 10: PopOver Term Selector (Future)
- Implement the PopOver component shown in the user's image
- Allow users to select years and months separately
- Auto-calculate the decimal representation
- Maintain backward compatibility with decimal input

### Phase 11: Advanced Term Features (Future)
- Quarter-based terms (e.g., 20 years 3 months)
- Custom term increments
- Term optimization suggestions

---

## ✅ Definition of Done

### Database
- [ ] term_months column added to amortizations table
- [ ] Database types updated
- [ ] Migration tested on staging environment

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] Unit tests pass (coverage >90%)
- [ ] Integration tests pass
- [ ] No ESLint warnings

### Functionality
- [ ] New mortgages store term_months
- [ ] Existing mortgages continue working with term_years
- [ ] All calculations use months-based logic
- [ ] UI displays terms correctly in years format
- [ ] Form validation enforces 5-30 year range

### User Experience
- [ ] Decimal year input works smoothly
- [ ] No breaking changes for existing users
- [ ] Performance remains acceptable
- [ ] Documentation is updated and clear

---

## 📞 Support and Questions

For any questions during implementation:
1. Refer to existing mortgage migration patterns in `docs/MORTGAGE_MIGRATION_GUIDE.md`
2. Use established migration file naming convention
3. Follow existing code patterns for backward compatibility
4. Test thoroughly with existing data before deployment

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Status**: Planning Phase 