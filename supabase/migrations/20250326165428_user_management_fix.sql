-- First drop the existing function
DROP FUNCTION IF EXISTS get_all_users();

-- Fix the get_all_users function to handle character varying type
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email character varying(255),  -- Changed from text to character varying(255)
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
) 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the current user has admin privileges
  DECLARE
    is_admin boolean;
  BEGIN
    SELECT p.is_admin INTO is_admin
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE u.id = auth.uid();
    
    IF is_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;
  END;

  -- Return all users with their roles
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    CASE WHEN p.is_admin THEN 'admin' ELSE 'user' END as role,
    u.created_at,
    u.last_sign_in_at
  FROM 
    auth.users u
  LEFT JOIN 
    public.profiles p ON u.id = p.id
  ORDER BY 
    u.created_at DESC;
END;
$$;
