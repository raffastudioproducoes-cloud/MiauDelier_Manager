-- Migration: 20260929210000_account_deletion_rpcs.sql
-- Add RPCs for account and data deletion

-- 1. Excluir conta inteira (Account Deletion)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleta o usuário da tabela auth.users.
  -- Isso irá acionar as restrições ON DELETE CASCADE em user_keys, perfis e sync_events.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- 2. Apagar dados do ateliê mantendo a conta (Data Deletion)
CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleta os eventos de sincronização para limpar os dados da nuvem.
  -- Usamos SECURITY DEFINER pois a tabela sync_events tem regra de bloqueio de deleção para usuários.
  DELETE FROM sync_events WHERE perfil_id IN (SELECT id FROM perfis WHERE user_id = auth.uid());
END;
$$;
