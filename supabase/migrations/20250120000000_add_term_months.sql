-- Add term_months column to amortizations table (backing table for mortgages view)
-- This enables enhanced precision for loan terms while maintaining backward compatibility

-- Add the term_months column as nullable to support gradual migration
ALTER TABLE amortizations 
ADD COLUMN term_months INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN amortizations.term_months IS 'Loan term in months for enhanced precision. When present, takes priority over term_years field.';

-- Create index for performance on term_months queries
CREATE INDEX idx_amortizations_term_months ON amortizations(term_months);

-- Create a composite index for queries that might filter by both term fields
CREATE INDEX idx_amortizations_term_fields ON amortizations(term_months, term_years); 