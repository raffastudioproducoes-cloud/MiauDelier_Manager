# Relatório de Reconciliação — Débitos vs Commits de 02/09

**Tarefa:** t_3a949ef5  
**Autor:** qa-seguranca  
**Data:** 2026-09-26  
**Fonte dos débitos:** corpo do task t_98ffb35a (SHA-256: `713c5835...`) — espelha `01-Status-e-Checklist.md`  

---

## Commits de 02/09 em diante (branch `wt/t_3a949ef5` / `219016b`)

| Hash | Data | Mensagem |
|------|------|----------|
| `78b73d6` | 02/09 00:59 | fix: resolve os 2 débitos cosméticos pendentes |
| `a973070` | 02/09 00:39 | feat: remove Pedir dica duplicado do menu, adiciona resumo da loja por IA no dashboard |
| `cbd8aa4` | 02/09 01:05 | feat: permite editar a chave de API do Gemini já configurada |
| `a659a4b` | 02/09 01:23 | fix: atualiza modelo Gemini descontinuado (2.0-flash → 3.6-flash) |
| `219016b` | 02/09 12:58 | feat: importa backup do GestoraX, corrige altura do menu e redesenha cards do Mais |

---

## Cruzamento débito × correção

### Débito 1 — Slider de progresso grava a cada tecla de seta (sem debounce) + sem teste de migração de schema

- **Status:** ✅ **CORRIGIDO**
- **Commit:** `78b73d6` (02/09 — dentro do janela)
- **Evidência:**
  - `src/features/vendas/PedidoDetalhePage.tsx` — constante `ATRASO_DEBOUNCE_PROGRESSO_MS = 400`; `handleMudarProgresso` agora usa `setTimeout` com debounce.
  - `src/db/schema.test.ts` — novo teste de regressão que abre banco v1, popula, reabre com schema v2 e confirma sobrevivência dos dados + `mensagensIA` funcional.

---

### Débito 2 — Mensagem de auditoria para "venda registrada" reaproveita texto de "alteração de preço"

- **Status:** ✅ **CORRIGIDO** (antes de 02/09)
- **Commit:** `78aac11` (01/09 00:59 — *antes* da janela)
- **Evidência:**
  - `src/features/auditoria/AuditoriaPage.tsx` linha 17: `"Preço de venda definido: R$ ${registro.valorNovo}"` — texto distinto de `"Preço alterado: R$ ${registro.valorAnterior} → R$ ${registro.valorNovo}"` (linha 20). A ambiguidade descrita no débito não existe mais.

---

### Débito 3 — Duplicação helper de iniciais + cards KPI com div estilizada + classes `.elevation-*` residuais

- **Status:** ✅ **CORRIGIDO** (antes de 02/09)
- **Commit:** `bb7ae2a` (01/09 00:03 — *antes* da janela)
- **Evidência:**
  - `src/lib/texto.ts` — `function iniciais(nome: string): string` é single source; `ClientesPage.tsx` e `ClienteDetalhePage.tsx` importam de `../../lib/texto`.
  - `src/features/dashboard/DashboardPage.tsx` — todos os 6 cards de KPI importam e usam `<Card>` de `components/ui/Card` (não mais `div` estilizada).
  - `grep -rn "elevation"` no codebase retorna zero ocorrências — classes do tema antigo removidas.

---

### Débito 4 — Não existe tela para mudar status de peça nem de pedido

- **Status:** ✅ **CORRIGIDO** (antes de 02/09)
- **Commits:**
  - `082a5e0` — "feat: pecas com multiplos materiais, exclusao com devolucao de estoque e tela de detalhe" (cria `PecaDetalhePage`)
  - `1aeb598` — "feat: mudanca de status de peca e venda gerando transacao automatica" (implementa `atualizarStatusPeca` + `handleMudarStatus`)
- **Evidência:**
  - `src/features/producao/PecaDetalhePage.tsx` — `OPCOES_STATUS: StatusPeca[]` com 6 statuse; `handleMudarStatus(novoStatus)` chama `atualizarStatusPeca(id, novoStatus)`. Status "vendida" abre modal de venda.
  - `src/features/vendas/PedidoDetalhePage.tsx` — `OPCOES_STATUS: StatusPedido[]` = `['aberto', 'em_producao', 'entregue', 'cancelado']`; `<select>` com `onChange → handleMudarStatus(e.target.value as StatusPedido)` que chama `atualizarStatusPedido(id, novoStatus)`.

---

## Síntese

| # | Débito | Status | Evidência |
|---|--------|--------|-----------|
| 1 | Slider progresso sem debounce + sem teste migração | ✅ Corrigido | `78b73d6` (02/09) |
| 2 | Mensagem auditoria "venda" genérica | ✅ Corrigido (antes) | `78aac11` (01/09) |
| 3 | Iniciais duplicadas + KPI com div + elevation-* | ✅ Corrigido (antes) | `bb7ae2a` (01/09) |
| 4 | Sem tela de status peça/pedido | ✅ Corrigido (antes) | `082a5e0`, `1aeb598` |

**Conclusão:** todos os 4 débitos registrados no documento `01-Status-e-Checklist.md` encontram-se corrigidos. Apenas o débito 1 foi corrigido por um commit de 02/09 ou posterior; os débitos 2, 3 e 4 foram corrigidos em commits de 01/09 ou anterior.

**Nenhum débito permanece aberto.**
