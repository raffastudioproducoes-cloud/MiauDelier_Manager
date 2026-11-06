# Protótipo de fila transacional — 06/11/2026

## Estado

Estudo isolado, **não integrado ao aplicativo e não pronto para produção**. A sincronização corrente continua gravando a fila depois do commit; uma interrupção entre as duas operações pode perder o evento. O protótipo `tests/prototypes/outbox-atomic.test.ts` cria um banco Dexie próprio, sem instalar hooks no banco real.

## Resultado verificado

O teste demonstra, com `fake-indexeddb`: escrita de registro e evento na mesma transação; conservação de ambos após reabrir; rollback conjunto de transação aninhada; falha fechada quando a transação não inclui a fila; e reenvio idempotente usando servidor **simulado** que rejeita UUID repetido com outro conteúdo. Esses testes não demonstram durabilidade frente a queda real de energia nem validade de uma implementação de servidor ou browser específicos.

## Mapeamento das escritas sincronizáveis

A pesquisa estática de `db.<tabela>.<método>` localizou referências em:

- `src/features/producao/pecasRepo.ts`: peças, consumo, eventos, material, forma, venda, atualização e exclusão em lote.
- `src/features/producao/materiaisRepo.ts`: cadastro, edição, exclusão, compra, reposição, histórico e transação financeira.
- `src/features/producao/formasRepo.ts`: forma e consumo de silicone; `curaRepo.ts`: peça e evento de cura.
- `src/features/producao/categoriasMaterialRepo.ts`, `equipamentosRepo.ts` e `vidaUtilRepo.ts`: categorias, equipamentos, eventos confirmados de vida útil e peça.
- `src/features/producao/estoqueServidor.ts`: aplicação local de saldos confirmados ou reconciliados.
- `src/features/vendas/clientesRepo.ts`, `pedidosRepo.ts` e `taxasRepo.ts`: clientes, pedidos, peças, eventos e transações de venda.
- `src/features/financeiro/contasRepo.ts`, `transacoesRepo.ts` e `src/features/auditoria/auditoriaRepo.ts`: contas, transações e auditoria.
- `src/lib/gestoraxImport.ts`: importação de categorias, materiais, formas, equipamentos, taxas, peças, consumos, eventos, contas e transações.
- `src/lib/backup.ts`: restauração/limpeza dinâmicas por `dbAlvo.table(nomeTabela)` ou `db.table(nomeTabela)`; `src/lib/syncService.ts`: aplicação remota com `table.put/delete`, troca de usuário com `clear` e snapshot completo.

Existem operações implícitas (sem `db.transaction`) e transações explícitas que não incluem a tabela da fila. Essa lista é o resultado de pesquisa textual e precisa ser novamente conferida, incluindo aliases, extensões, migrações, testes, novos caminhos e chamadas dinâmicas; não é prova de exaustividade. Aplicação remota e troca de conta exigem regras próprias para não gerar eco de eventos nem perder pendências.

## Trabalho necessário antes de integrar

1. Refatorar **todas** as transações raiz de escrita sincronizável para incluírem a outbox, inclusive operações implícitas, escritas aninhadas, importação e restauração. A criação do evento precisa participar da transação que grava o dado; falhas da fila precisam abortar a operação. Não empregar fallback silencioso pós-commit.
2. Definir eventos de inserção, alteração, exclusão, coalescência na mesma transação, identidades estáveis, e escopo de usuário/perfil. Cobrir ordem de gravação e múltiplas abas.
3. Tornar o servidor idempotente por ID de evento e conteúdo; a fila somente pode apagar eventos após confirmação recuperável. O upload atual com `.insert` pode receber erro de chave duplicada após perda da resposta.
4. Resolver separadamente a autoridade dos saldos no servidor e a migração de snapshots/clientes legados; a atomicidade local da outbox **não** impede snapshots antigos de sobrescreverem saldo nem resolve relógios dessincronizados.
5. Validar com banco isolado, dois clientes/sessões concorrentes, reinício forçado, falhas antes/depois do commit e da resposta, queda de conexão, importação, backup e retomada. Exigir revisão independente e plano de rollout antes de produção.

## Comando de verificação do protótipo

No diretório do projeto, com dependências existentes instaladas e variáveis Supabase fictícias para a suíte:

```bash
VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_ANON_KEY=dummy-anon-key npx vitest run tests/prototypes/outbox-atomic.test.ts
```
