# Mortgage Terminology Migration Guide

This guide outlines the process for transitioning from `amortizations` to `mortgages` terminology in our codebase.

## Current Status

We've created a database view called `mortgages` that maps to the existing `amortizations` table. This allows us to gradually migrate code while maintaining backward compatibility.

## Migration Steps

### Phase 1: Database View (Completed)

- ✅ Created the `mortgages` view in the database that mirrors the `amortizations` table
- ✅ Set proper permissions for the view

### Phase 2: API and Service Layer Updates

When updating API endpoints and services, use these guidelines:

1. **New Features**: For any new features, use the `mortgages` terminology exclusively
2. **Existing Features**: When modifying existing code, gradually update to use `mortgages` instead of `amortizations`

Example of updating a Supabase query:

```typescript
// Before
const { data } = await supabase
  .from("amortizations")
  .select("*")
  .eq("user_id", userId);

// After
const { data } = await supabase
  .from("mortgages")  // Use the new view
  .select("*")
  .eq("user_id", userId);
```

### Phase 3: Type and Interface Updates

1. Create new interfaces/types that use "mortgage" terminology
2. Export the old types with the new names for backward compatibility

Example:

```typescript
// src/types/mortgage.ts
export interface Mortgage {
  id: string;
  name: string;
  // ... other properties
}

// For backward compatibility
export type Amortization = Mortgage;
```

### Phase 4: Component and UI Updates

1. Rename component files when updating (e.g., `AmortizationTable.tsx` → `MortgageTable.tsx`)
2. Update imports in all files that reference the renamed components
3. Use the new terminology in UI elements, messages, and translations

### Phase 5: Database Migration (Future)

Once all code has been updated to use the `mortgages` view:

1. Create a migration script to rename the actual table
2. Update the view to match the new table name
3. Update any remaining foreign keys or references

## Testing Guidelines

- For each update, test thoroughly to ensure functionality is maintained
- Pay special attention to form submissions and data loading/saving
- Use the test queries in `supabase/test_mortgages_view.sql` to verify database operations

## Progress Tracking

Track your progress by keeping a list of files/components that have been updated:

- [ ] API endpoints
- [ ] Service layer functions
- [ ] Type definitions
- [ ] React components
- [ ] UI text and translations 