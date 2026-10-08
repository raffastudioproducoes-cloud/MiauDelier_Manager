-- This function is only invoked by the table trigger; it must not be an RPC.
REVOKE ALL ON FUNCTION public.delete_user_gemini_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_gemini_key() TO service_role;
