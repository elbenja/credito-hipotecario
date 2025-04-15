-- SQL script to remove NOT NULL constraints from columns in amortizations table

-- Make total_interest nullable
ALTER TABLE amortizations ALTER COLUMN total_interest DROP NOT NULL;

-- Make total_payment nullable
ALTER TABLE amortizations ALTER COLUMN total_payment DROP NOT NULL;

-- Make installment_amount nullable
ALTER TABLE amortizations ALTER COLUMN installment_amount DROP NOT NULL;

-- Let's also update the "mortgages" table if it exists and has these columns
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'mortgages' AND column_name = 'total_interest'
    ) THEN
        EXECUTE 'ALTER TABLE mortgages ALTER COLUMN total_interest DROP NOT NULL';
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'mortgages' AND column_name = 'total_payment'
    ) THEN
        EXECUTE 'ALTER TABLE mortgages ALTER COLUMN total_payment DROP NOT NULL';
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'mortgages' AND column_name = 'installment_amount'
    ) THEN
        EXECUTE 'ALTER TABLE mortgages ALTER COLUMN installment_amount DROP NOT NULL';
    END IF;
END
$$; 