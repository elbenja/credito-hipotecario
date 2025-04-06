-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create plan features table with limits
CREATE TABLE IF NOT EXISTS plan_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_limit INTEGER NOT NULL, -- -1 can represent unlimited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(plan_id, feature_name)
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, expired
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  payment_provider TEXT, -- stripe, paypal, etc.
  payment_provider_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id) -- Each user can only have one active subscription
);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION update_subscription_updated_at_column();

CREATE TRIGGER update_plan_features_updated_at
BEFORE UPDATE ON plan_features
FOR EACH ROW
EXECUTE FUNCTION update_subscription_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscription_updated_at_column();

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_plans
CREATE POLICY "Anyone can read subscription plans" 
ON subscription_plans FOR SELECT 
TO PUBLIC
USING (is_active = true);

CREATE POLICY "Only admins can modify subscription plans" 
ON subscription_plans FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Create RLS policies for plan_features
CREATE POLICY "Anyone can read plan features" 
ON plan_features FOR SELECT 
TO PUBLIC
USING (
  EXISTS (
    SELECT 1 FROM subscription_plans
    WHERE subscription_plans.id = plan_features.plan_id AND subscription_plans.is_active = true
  )
);

CREATE POLICY "Only admins can modify plan features" 
ON plan_features FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Create RLS policies for user_subscriptions
CREATE POLICY "Users can read their own subscriptions" 
ON user_subscriptions FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only admins can read all subscriptions" 
ON user_subscriptions FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Users cannot modify subscriptions directly" 
ON user_subscriptions FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Only admins can modify subscriptions" 
ON user_subscriptions FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Insert initial subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly)
VALUES 
  ('Personal', 'Basic plan for personal use', 1.24, 14.90),
  ('Profesional', 'Professional plan for business use', 2.08, 24.90),
  ('Inversionista', 'Investor plan for unlimited use', 6.66, 79.90);

-- Insert features with limits for each plan
-- Personal Plan
INSERT INTO plan_features (plan_id, feature_name, feature_limit)
VALUES 
  ((SELECT id FROM subscription_plans WHERE name = 'Personal'), 'properties', 3),
  ((SELECT id FROM subscription_plans WHERE name = 'Personal'), 'mortgages', 10),
  ((SELECT id FROM subscription_plans WHERE name = 'Personal'), 'rentals', 1);

-- Professional Plan
INSERT INTO plan_features (plan_id, feature_name, feature_limit)
VALUES 
  ((SELECT id FROM subscription_plans WHERE name = 'Profesional'), 'properties', 10),
  ((SELECT id FROM subscription_plans WHERE name = 'Profesional'), 'mortgages', 50),
  ((SELECT id FROM subscription_plans WHERE name = 'Profesional'), 'rentals', 5);

-- Investor Plan
INSERT INTO plan_features (plan_id, feature_name, feature_limit)
VALUES 
  ((SELECT id FROM subscription_plans WHERE name = 'Inversionista'), 'properties', -1), -- -1 represents unlimited
  ((SELECT id FROM subscription_plans WHERE name = 'Inversionista'), 'mortgages', -1),
  ((SELECT id FROM subscription_plans WHERE name = 'Inversionista'), 'rentals', -1);

-- Create function to check if a user has reached their limit for a specific feature
CREATE OR REPLACE FUNCTION check_user_feature_limit(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  -- Get the user's feature limit from their subscription
  SELECT pf.feature_limit INTO v_limit
  FROM user_subscriptions us
  JOIN plan_features pf ON us.plan_id = pf.plan_id
  WHERE us.user_id = p_user_id
  AND us.status = 'active'
  AND pf.feature_name = p_feature_name;
  
  -- If no subscription or feature found, return false
  IF v_limit IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If unlimited (-1), return true
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Count current usage based on feature name
  IF p_feature_name = 'properties' THEN
    SELECT COUNT(*) INTO v_count FROM properties WHERE user_id = p_user_id;
  ELSIF p_feature_name = 'mortgages' THEN
    SELECT COUNT(*) INTO v_count FROM amortizations WHERE user_id = p_user_id;
  ELSIF p_feature_name = 'rentals' THEN
    -- Assuming you have a rentals table
    SELECT COUNT(*) INTO v_count FROM rental_properties WHERE user_id = p_user_id;
  ELSE
    -- Unknown feature
    RETURN FALSE;
  END IF;
  
  -- Return true if under limit, false if at or over limit
  RETURN v_count < v_limit;
END;
$$; 