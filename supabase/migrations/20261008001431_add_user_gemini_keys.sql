-- Gemini keys are server-only. The browser never reads or persists them.
CREATE TABLE IF NOT EXISTS public.user_gemini_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gemini_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_gemini_keys FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_user_gemini_key(p_user_id uuid, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  existing_secret_id uuid;
BEGIN
  IF p_user_id IS NULL OR length(trim(p_key)) < 20 OR length(p_key) > 512 THEN
    RAISE EXCEPTION 'Invalid Gemini API key';
  END IF;

  SELECT secret_id INTO existing_secret_id
  FROM public.user_gemini_keys
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF existing_secret_id IS NULL THEN
    existing_secret_id := vault.create_secret(p_key, 'gemini_' || p_user_id::text, 'User Gemini API key');
    INSERT INTO public.user_gemini_keys (user_id, secret_id)
    VALUES (p_user_id, existing_secret_id);
  ELSE
    PERFORM vault.update_secret(existing_secret_id, p_key, 'gemini_' || p_user_id::text, 'User Gemini API key');
    UPDATE public.user_gemini_keys SET updated_at = now() WHERE user_id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_gemini_key(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets AS secrets
  INNER JOIN public.user_gemini_keys AS keys ON keys.secret_id = secrets.id
  WHERE keys.user_id = p_user_id
$$;

CREATE OR REPLACE FUNCTION public.delete_user_gemini_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = OLD.secret_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS delete_user_gemini_key_secret ON public.user_gemini_keys;
CREATE TRIGGER delete_user_gemini_key_secret
  BEFORE DELETE ON public.user_gemini_keys
  FOR EACH ROW EXECUTE FUNCTION public.delete_user_gemini_key();

REVOKE ALL ON FUNCTION public.set_user_gemini_key(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_gemini_key(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_gemini_key(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_gemini_key(uuid) TO service_role;;
