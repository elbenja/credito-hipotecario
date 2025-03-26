-- Create a function to get all users with their roles
-- This function can only be called by authenticated users with admin privileges
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
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

-- Create a password reset page
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, avatar_url, full_name, is_admin)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'full_name', false)
  ON CONFLICT (id) DO UPDATE
  SET email = NEW.email;
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user(); 