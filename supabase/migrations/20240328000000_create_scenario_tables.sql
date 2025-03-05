-- Create enum for scenario types
CREATE TYPE scenario_type AS ENUM ('regular', 'accelerated', 'lower_payment', 'new_rate');

-- Create table for scenario summaries
CREATE TABLE scenario_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    amortization_id UUID NOT NULL REFERENCES amortizations(id) ON DELETE CASCADE,
    scenario_type scenario_type NOT NULL,
    total_interest_and_insurance DECIMAL(12,2) NOT NULL,
    total_months INTEGER NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(amortization_id, scenario_type)
);

-- Create table for scenario payment schedules
CREATE TABLE scenario_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_summary_id UUID NOT NULL REFERENCES scenario_summaries(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    capital DECIMAL(12,2) NOT NULL,
    interest DECIMAL(12,2) NOT NULL,
    property_insurance DECIMAL(12,2) NOT NULL,
    loan_insurance DECIMAL(12,2) NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    is_different_from_base BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_scenario_summaries_amortization ON scenario_summaries(amortization_id);
CREATE INDEX idx_scenario_payments_summary ON scenario_payments(scenario_summary_id);
CREATE INDEX idx_scenario_payments_date ON scenario_payments(payment_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_scenario_summaries_updated_at
    BEFORE UPDATE ON scenario_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenario_payments_updated_at
    BEFORE UPDATE ON scenario_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 