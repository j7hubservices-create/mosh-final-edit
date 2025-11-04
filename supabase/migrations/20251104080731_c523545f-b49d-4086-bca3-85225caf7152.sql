-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_user_created_send_welcome ON auth.users;
DROP FUNCTION IF EXISTS public.send_welcome_email_after_signup();

-- Create a simpler function that uses pg_net for async HTTP calls
CREATE OR REPLACE FUNCTION public.send_welcome_email_after_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Make async HTTP call using pg_net extension (non-blocking)
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'name', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users to send welcome email after insert
CREATE TRIGGER on_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_after_signup();