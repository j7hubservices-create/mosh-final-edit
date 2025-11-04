-- Enable http extension for async API calls
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create function to send welcome email asynchronously after user creation
CREATE OR REPLACE FUNCTION public.send_welcome_email_after_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  service_role_key text;
  supabase_url text;
BEGIN
  -- Get environment variables
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Make async HTTP call to welcome email edge function (non-blocking)
  SELECT http_post(
    supabase_url || '/functions/v1/send-welcome-email',
    json_build_object(
      'email', NEW.email,
      'name', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )::text,
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_role_key),
      http_header('Content-Type', 'application/json')
    ]
  ) INTO request_id;
  
  -- Return NEW to continue with user creation (don't wait for email)
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users to send welcome email after insert
DROP TRIGGER IF EXISTS on_user_created_send_welcome ON auth.users;
CREATE TRIGGER on_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_after_signup();