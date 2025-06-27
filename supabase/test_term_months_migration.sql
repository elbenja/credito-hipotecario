-- Test script to validate the term_months migration
-- This is for testing only and not part of the migrations

-- Check that term_months column was added to amortizations table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'amortizations' 
    AND column_name IN ('term_years', 'term_months')
ORDER BY column_name;

-- Verify indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'amortizations' 
    AND indexname LIKE '%term%';

-- Test that existing mortgages still work with term_years only
SELECT 
    id, 
    name, 
    term_years, 
    term_months,
    CASE 
        WHEN term_months IS NOT NULL THEN term_months
        ELSE term_years * 12
    END as effective_months
FROM amortizations 
LIMIT 3;

-- Test column comment
SELECT 
    col_description(
        (SELECT oid FROM pg_class WHERE relname = 'amortizations'), 
        (SELECT ordinal_position FROM information_schema.columns 
         WHERE table_name = 'amortizations' AND column_name = 'term_months')
    ) as column_comment; 