-- Migration: 20261005170000_add_data_hash_to_perfis.sql
-- Adiciona a coluna data_hash à tabela perfis para resolver o erro PGRST204

ALTER TABLE perfis ADD COLUMN IF NOT EXISTS data_hash TEXT;
