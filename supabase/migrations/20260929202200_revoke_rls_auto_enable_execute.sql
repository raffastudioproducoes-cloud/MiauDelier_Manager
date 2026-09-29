-- Fix for Supabase Security Linter warnings (anon_security_definer_function_executable, authenticated_security_definer_function_executable)

-- Revoke execute on the rls_auto_enable function from anon and authenticated roles
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
