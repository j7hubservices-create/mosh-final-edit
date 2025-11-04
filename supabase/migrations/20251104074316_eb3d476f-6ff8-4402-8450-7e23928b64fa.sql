-- Drop the trigger on profiles table first
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;

-- Drop the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now drop the function
DROP FUNCTION IF EXISTS public.send_welcome_email_trigger();