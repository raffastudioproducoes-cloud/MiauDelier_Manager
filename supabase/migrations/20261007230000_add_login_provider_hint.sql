-- Only the Edge Function's service_role may look up social login hints.
CREATE OR REPLACE FUNCTION public.get_login_provider_hint(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT identities.provider
  FROM auth.users AS users
  INNER JOIN auth.identities AS identities ON identities.user_id = users.id
  WHERE lower(users.email) = lower(trim(p_email))
    AND identities.provider IN ('google', 'apple')
  ORDER BY CASE identities.provider WHEN 'google' THEN 1 WHEN 'apple' THEN 2 END
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_login_provider_hint(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_login_provider_hint(text) TO service_role;
