-- Create a view named 'mortgages' that maps to the existing 'amortizations' table
CREATE OR REPLACE VIEW mortgages AS 
SELECT * FROM amortizations;

-- Grant the same permissions to the view as the original table
GRANT SELECT, INSERT, UPDATE, DELETE ON mortgages TO authenticated;
GRANT SELECT ON mortgages TO anon;

-- Add a comment to the view for documentation
COMMENT ON VIEW mortgages IS 'View that maps to the amortizations table for better terminology'; 