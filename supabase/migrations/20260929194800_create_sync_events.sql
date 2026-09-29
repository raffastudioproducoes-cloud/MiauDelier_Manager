-- Criar a tabela de eventos de sincronização (Event Sourcing / Ledger)
CREATE TABLE sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id bigint NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  tabela text NOT NULL, -- ex: 'transacoes', 'clientes', 'pecas'
  registro_id text NOT NULL, -- ID original no Dexie (convertido para string se for number)
  acao text NOT NULL, -- 'insert', 'update', 'delete'
  dados_criptografados text, -- O conteúdo cifrado/assinado (AES-GCM) da operação
  timestamp bigint NOT NULL, -- Timestamp ou Logical Clock de quando a ação ocorreu no cliente
  criado_em timestamptz DEFAULT now()
);

-- Habilitar RLS (Segurança de Nível de Linha)
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- O usuário só pode ver os eventos se o perfil_id pertencer a ele
CREATE POLICY "Usuário pode ver eventos de seus perfis" ON sync_events
  FOR SELECT USING (
    perfil_id IN (
      SELECT id FROM perfis WHERE user_id = auth.uid()
    )
  );

-- O usuário só pode inserir eventos se o perfil_id pertencer a ele
CREATE POLICY "Usuário pode inserir eventos em seus perfis" ON sync_events
  FOR INSERT WITH CHECK (
    perfil_id IN (
      SELECT id FROM perfis WHERE user_id = auth.uid()
    )
  );

-- EVENT SOURCING EXIGE IMUTABILIDADE!
-- Bloqueamos expressamente UPDATE e DELETE em eventos que já entraram no Ledger.
CREATE POLICY "Ninguém pode atualizar eventos" ON sync_events FOR UPDATE USING (false);
CREATE POLICY "Ninguém pode deletar eventos" ON sync_events FOR DELETE USING (false);

-- Índices para otimizar busca de sincronização
CREATE INDEX sync_events_perfil_id_timestamp_idx ON sync_events (perfil_id, timestamp);
CREATE INDEX sync_events_registro_idx ON sync_events (tabela, registro_id);
