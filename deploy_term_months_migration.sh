#!/bin/bash

# Deploy the term_months migration
echo "🚀 Applying term_months migration..."

# Apply the migration to add term_months column
echo "📊 Adding term_months column to amortizations table..."
supabase db push

# Generate updated TypeScript types
echo "🔧 Updating TypeScript types..."
supabase gen types typescript --local > src/integrations/supabase/types.ts

echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Verify the migration applied successfully"
echo "  2. Test existing mortgages still work with term_years"
echo "  3. Begin Phase 2: Update type system with utility functions"
echo ""
echo "📖 See docs/Term_Months_Implementation_PLAN.md for the complete implementation plan." 