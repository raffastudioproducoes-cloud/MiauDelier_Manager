-- Do not reveal which accounts have a social identity before authentication.
REVOKE ALL ON FUNCTION public.get_login_provider_hint(text) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.get_login_provider_hint(text);
