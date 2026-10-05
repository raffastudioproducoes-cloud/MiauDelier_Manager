-- Fix function_search_path_mutable and anon_security_definer_function_executable

-- 1. Redefine delete_user_account to include SET search_path = public
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleta o usuário da tabela auth.users.
  -- Isso irá acionar as restrições ON DELETE CASCADE em user_keys, perfis e sync_events.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Revoke default public execute access and anon execute access
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM public;
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;

-- Explicitly grant execute to authenticated users ONLY
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;


-- 2. Redefine delete_user_data to include SET search_path = public
CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleta os eventos de sincronização para limpar os dados da nuvem.
  DELETE FROM sync_events WHERE perfil_id IN (SELECT id FROM perfis WHERE user_id = auth.uid());
END;
$$;

-- Revoke default public execute access and anon execute access
REVOKE EXECUTE ON FUNCTION delete_user_data() FROM public;
REVOKE EXECUTE ON FUNCTION delete_user_data() FROM anon;

-- Explicitly grant execute to authenticated users ONLY
GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
