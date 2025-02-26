ALTER TABLE properties ADD COLUMN property_insurance_type TEXT DEFAULT 'auto' CHECK (property_insurance_type IN ('auto', 'manual')); ALTER TABLE properties DROP COLUMN other_expenses;
