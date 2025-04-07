#!/bin/bash

# Deploy the new mortgages view migration
echo "Applying mortgages view migration..."

# Assuming you are using Supabase CLI for migrations
# Update this command based on your actual deployment method
supabase db push

echo "Migration complete! You can now gradually update your code to use \"mortgages\" instead of \"amortizations\"."
echo "See docs/MORTGAGE_MIGRATION_GUIDE.md for detailed instructions." 