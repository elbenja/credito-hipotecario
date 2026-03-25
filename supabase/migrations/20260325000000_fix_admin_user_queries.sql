-- Migration: Fix admin user queries
-- 1. Update get_all_users() to include subscription data (avoids .in() URL overflow)
-- 2. Create get_mortgage_and_property_counts_for_admins() which was missing

DROP FUNCTION IF EXISTS get_all_users();

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email character varying(255),
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  current_period_start timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT p.is_admin INTO is_admin_user
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE u.id = auth.uid();

  IF is_admin_user IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    CASE WHEN p.is_admin THEN 'admin'::text ELSE 'user'::text END AS role,
    u.created_at,
    u.last_sign_in_at,
    us.id            AS subscription_id,
    us.plan_id,
    sp.name::text    AS plan_name,
    us.current_period_start
  FROM auth.users u
  LEFT JOIN public.profiles p            ON u.id = p.id
  LEFT JOIN public.user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  ORDER BY u.created_at DESC;
END;
$$;


CREATE OR REPLACE FUNCTION get_mortgage_and_property_counts_for_admins()
RETURNS TABLE (
  user_id        uuid,
  mortgage_count bigint,
  property_count bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT p.is_admin INTO is_admin_user
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE u.id = auth.uid();

  IF is_admin_user IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT
    u.id                            AS user_id,
    COUNT(DISTINCT a.id)::bigint    AS mortgage_count,
    COUNT(DISTINCT prop.id)::bigint AS property_count
  FROM auth.users u
  LEFT JOIN public.amortizations a  ON u.id = a.user_id
  LEFT JOIN public.properties prop  ON u.id = prop.user_id
  GROUP BY u.id;
END;
$$;
