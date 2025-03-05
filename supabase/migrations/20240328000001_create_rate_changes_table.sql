-- Create table for rate changes
CREATE TABLE rate_changes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    amortization_id UUID NOT NULL REFERENCES amortizations(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    new_interest_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_rate_changes_amortization ON rate_changes(amortization_id);
CREATE INDEX idx_rate_changes_date ON rate_changes(effective_date);

-- Create trigger for updated_at
CREATE TRIGGER update_rate_changes_updated_at
    BEFORE UPDATE ON rate_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 