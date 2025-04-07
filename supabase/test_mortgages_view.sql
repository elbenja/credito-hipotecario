-- Test query to verify the mortgages view works correctly
-- This is for testing only and not part of the migrations

-- Count records to check that the view returns the same number of records as the table
SELECT 'Amortizations count' AS check_type, COUNT(*) AS count FROM amortizations
UNION ALL
SELECT 'Mortgages view count' AS check_type, COUNT(*) AS count FROM mortgages;

-- Test a simple SELECT query
SELECT id, name, loan_amount, interest_rate, term_years, property_id 
FROM mortgages 
LIMIT 5;

-- Test that the view can be used for INSERT operations (commented out for safety)
/*
INSERT INTO mortgages (
  name, property_id, user_id, loan_amount, down_payment, interest_rate, 
  term_years, installments_per_year, loan_protection_type, loan_protection_insurance,
  first_installment_date, down_payment_percentage
)
VALUES (
  'Test Mortgage via View', -- Change this before running
  '00000000-0000-0000-0000-000000000000', -- Replace with actual property_id
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
  200000, 50000, 5.5, 30, 12, 'none', 0,
  '2024-06-01', 20
)
RETURNING id, name;
*/ 