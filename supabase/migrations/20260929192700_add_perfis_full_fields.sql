-- Migration: 20260929192700_add_perfis_full_fields.sql
-- Adiciona todos os campos de metadados do ateliê na tabela perfis
-- para que o perfil completo seja sincronizado na nuvem entre dispositivos.

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS nome_dono    TEXT,
  ADD COLUMN IF NOT EXISTS email_dono   TEXT,
  ADD COLUMN IF NOT EXISTS documento    TEXT,
  ADD COLUMN IF NOT EXISTS telefone     TEXT,
  ADD COLUMN IF NOT EXISTS endereco     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índice para sincronização incremental por updated_at
CREATE INDEX IF NOT EXISTS perfis_user_id_updated_at_idx ON perfis (user_id, updated_at);
