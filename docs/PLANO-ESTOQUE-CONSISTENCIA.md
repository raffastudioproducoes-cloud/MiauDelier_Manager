# Plano: estoque consistente entre dispositivos

## Situação verificada

- O cliente grava materiais, peças e formas no IndexedDB e publica alterações como snapshots na fila `sync_events`.
- A consulta de diagnóstico de 04/11/2026 encontrou 122 eventos de materiais e nenhuma linha na tabela PostgreSQL `materiais`; essa tabela não pode ser tratada como saldo autoritativo atual.
- Uma verificação `navigator.onLine` detecta ausência de conexão informada pelo navegador; não confirma disponibilidade do Supabase nem garante exclusividade entre dispositivos.

## Entregue no código local

- Verificação de saldo por material nas transações Dexie, incluindo somatório em linhas repetidas na reativação; estorno e reativação preservam atomicidade local.
- Validação visual em moldes, peças e reativação; dados do modelo e da peça são preservados ao remover resultados de resina da tela de moldes. Quantidades de silicone são exibidas em kg e convertidas para a unidade do estoque.
- Bloqueio local das baixas quando o navegador informa estar offline, com preservação do formulário. Isso não é uma garantia de bloqueio quando a rede está conectada, mas o serviço remoto indisponível.

## Necessário para garantia entre dispositivos — ainda não implementado

Em 04/11/2026 foi instalada no Supabase existente a migração aditiva
`20261104220000_estoque_operacao_atomica.sql`. A função verifica propriedade do
perfil, serializa movimentações por perfil, rejeita saldo insuficiente e evita
repetição por identificador de operação. O teste SQL de baixa, saldo insuficiente,
repetição e acesso de outra conta foi executado em transação revertida.

**A integração não protege a sincronização antiga.**
Ela não deve ser tratada como trava global até que todas as escritas de estoque
e eventos antigos sejam integrados e haja recuperação de falhas intermediárias.

Implementação integrada: os repositórios de moldes, peças e materiais
chamam a função antes de concluir a transação local. Os testes de repositório
com servidor simulado passaram, mas a recuperação de resposta perdida ainda não
está pronta e a sincronização antiga pode sobrescrever o resultado. Os testes de
telas existentes precisam de uma sessão e de um servidor simulados. A publicação
foi solicitada pelo usuário com conhecimento dos riscos pendentes.

Em 05/11/2026, a pedido do usuário, foram removidos 11 testes de tela que
falhavam sem a confirmação do servidor. Essa remoção reduz a cobertura; não
comprova a integração real nem corrige as demais falhas identificadas no CI.

1. Definir saldo autoritativo por perfil e material no servidor, com transação que valide o saldo e registre baixa, reposição, devolução e operação relacionada de forma indivisível; identificar pedidos de forma idempotente para retomada após falha ou repetição.
2. Migrar saldos a partir do histórico efetivamente sincronizado, identificando e conciliando dispositivos com alterações pendentes. Não presumir que a tabela `materiais` vazia seja uma fonte de saldo.
3. Integrar todas as escritas e a sincronização existentes à mesma regra, inclusive compras, ajustes, formas, produção, cancelamento, reativação, venda e clientes em versões anteriores. Evitar que snapshots antigos substituam saldos já debitados.
4. Bloquear baixas quando a autorização do servidor falhar ou não estiver acessível, mantendo o rascunho. Tratar a queda entre confirmação remota e atualização local com recuperação idempotente; não depender de `navigator.onLine` para afirmar que o serviço está disponível.
5. Testar migração e concorrência de múltiplos dispositivos, falta de rede, tentativas repetidas, unidades, falhas intermediárias e reconciliação em um banco isolado antes de alterar o banco produtivo.

Não há garantia entre dispositivos nem confirmação transacional do servidor na versão local em andamento. A aplicação da migração no banco real requer uma solução testada e um plano de recuperação; não foram alterados dados ou esquema do Supabase nesta tarefa.
