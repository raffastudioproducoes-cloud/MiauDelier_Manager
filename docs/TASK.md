# Tarefas do Projeto (TASK.md)

Este documento representa o plano de execução e o estado atual das tarefas do **MiauDelier Manager**.

---

## Resumo de Progresso

- **Total de Tarefas**: 30
- **Concluídas**: 29
- **Em Andamento**: 0
- **Não Iniciadas**: 5

---


## Fase 1 — Fundação, Autenticação e Segurança de Acesso

**Objetivo**: Estabelecer o schema Dexie, o fluxo de autenticação Supabase e a proteção de sessão.

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 1.1 | Criar schema inicial Dexie.js e entidades de banco no IndexedDB (`src/db/schema.ts`) | Alta | Concluída |
| 1.2 | Remover a cifra interna legada e manter chaves sensíveis fora do frontend | Alta | Concluída |
| 1.3 | Criar gerenciador de login com bloqueio temporário de tentativas em `src/lib/auth.ts` | Alta | Concluída |
| 1.4 | Aplicar Supabase Auth, RLS e HTTPS como proteção de acesso aos dados | Alta | Concluída |
| 1.5 | Criar Zustand `authStore` para gerenciamento de sessão e chave simétrica em memória | Alta | Concluída |

---

## Fase 2 — Motores de Cálculo, Precificação e Validação

**Objetivo**: Implementar o motor de cálculo geométrico de volume/proporção e o motor de precificação real.

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 2.1 | Implementar motor de cálculo de volume (retangular, cilíndrico, esférico, direto) | Alta | Concluída |
| 2.2 | Implementar suporte a furos/vazados em comedouros pets e pés de mesa resinados | Alta | Concluída |
| 2.3 | Implementar motor de precificação (custo direto + amortização de molde + mão de obra + taxas + margem) | Alta | Concluída |
| 2.4 | Criar módulo de conversão automática de unidades de medida (ml, L, g, kg, un) e formatação legível de volume e massa | Alta | Concluída |

---

## Fase 3 — Produção, Moldes, Peças e Vitrine WhatsApp

**Objetivo**: Construir a gestão completa do ateliê (materiais, moldes, peças, mídias e vitrine).

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 3.1 | Implementar controle de estoque de materiais e categorias hierárquicas | Alta | Concluída |
| 3.2 | Implementar gestão de moldes/formas com caixas de contenção e amortização por uso | Alta | Concluída |
| 3.3 | Implementar gestão de peças com número de série (`#0001`), débitos de material e estornos no cancelamento | Alta | Concluída |
| 3.4 | Implementar componente `SeletorImagem` com captura de foto via câmera (permissões/fallback) e galeria | Alta | Concluída |
| 3.5 | Criar aba "Vitrine - Peças Prontas" com postagens formatadas e link direto de atendimento no WhatsApp | Alta | Concluída |
| 3.6 | Implementar fluxo por 4 etapas de produção (Molde/Volume Sugerido em L e kg, Cura Flexível em Dias/Horas/Minutos, Desmolde/EPIs, Propaganda/Frete) | Alta | Concluída |
| 3.7 | Implementar tela de detalhes da peça com linha do tempo de eventos, discriminação por etapas e modal de venda automática | Alta | Concluída |
| 3.8 | Implementar cronômetro de cura em tempo real com contagem regressiva viva, barra de progresso, notificação ao finalizar sem alteração forçada de status e extensão de tempo ("➕ Adicionar Tempo de Cura") | Alta | Concluída |
| 3.9 | Implementar divisões do estoque em abas por tipo de material (`INSUMO`, `FERRAMENTA`, `ADMINISTRATIVO`, `EPI`) mantendo subcategorias flexíveis | Alta | Concluída |

---

## Fase 4 — Vendas, Clientes, Financeiro e Auditoria

**Objetivo**: Implementar a gestão de clientes, controle de pedidos, contas bancárias e histórico imutável.

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 4.1 | Implementar módulo de cadastro e gestão de clientes | Alta | Concluída |
| 4.2 | Implementar gestão de pedidos com atualização de progresso em debounce | Alta | Concluída |
| 4.3 | Implementar cadastro de contas bancárias e transações financeiras sincronizáveis | Alta | Concluída |
| 4.4 | Criar tela de taxas de cartão/plataforma e precificação de equipamentos (potência/energia) | Média | Concluída |
| 4.5 | Implementar registro de auditoria imutável para vendas, exclusões e alterações de preço | Média | Concluída |

---

## Fase 5 — Inteligência Artificial & Central de Backup

**Objetivo**: Integrar o resumo diário com IA (Gemini) e a central de backup protegida por checksum SHA-256.

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 5.1 | Implementar assistente Gemini via Edge Function com chave fora do navegador | Média | Concluída |
| 5.2 | Implementar resumo do Dashboard com indicadores reais, cache por assinatura e atualização manual | Média | Concluída |
| 5.3 | Implementar exportação e importação de backups JSON com validação de checksum SHA-256 | Alta | Concluída |
| 5.4 | Implementar opção de apagar dados na aba de backup mantendo preservados os dados do Perfil do Ateliê e a senha de acesso | Alta | Concluída |


---

## Fase 6 — Infraestrutura, PWA e CI/CD

**Objetivo**: Garantir empacotamento offline PWA e esteira de integração contínua.

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 6.1 | Configurar manifesto PWA e Service Worker via `vite-plugin-pwa` para execução offline | Alta | Concluída |
| 6.2 | Garantir suíte de testes (Vitest + Testing Library) com 100% de cobertura nos fluxos críticos | Alta | Concluída |
| 6.3 | Configurar pipeline de CI/CD para lint, verificação de tipos (`tsc`) e build automatizado | Média | Concluída |
| 6.4 | Implementar registrador de eventos e captura de falhas silenciosas (`src/lib/logger.ts`, `ErrorBoundary`, `/logs`) com sanitização de senhas/dados sensíveis | Alta | Concluída |

---

## Fase 7 — Cloud, Sincronização e Autenticação Social

**Objetivo**: Evoluir o sistema local-first para um formato híbrido, permitindo sincronização em nuvem e login seguro via Supabase.

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 7.1 | Configurar Supabase CLI, Schema (PostgreSQL + RLS) e estrutura de 10 perfis isolados por usuário | Alta | Concluída |
| 7.2 | Implementar Autenticação 2-passos via Google (Auth Nuvem + Desbloqueio do Cofre Local) | Alta | Concluída |
| 7.3 | Implementar Autenticação via Email com confirmação OTP de 5 minutos | Alta | Concluída |
| 7.4 | Implementar funcionalidade de "Mesclar Conta" na aba de Gestão de Perfis | Alta | Não iniciada |
| 7.5 | Desenvolver mecanismo de sincronização bidirecional em tempo real (Dexie ↔ Supabase) | Alta | Não iniciada |
| 7.6 | Implementar autenticação via Apple | Baixa | Futuramente |

---

## Fase 8 — Refinamento PWA e Observabilidade de Decisão

| ID | Tarefa | Prioridade | Status |
| --- | --- | --- | --- |
| 8.1 | Padronizar ícones, tema escuro e tela de abertura do PWA Android | Alta | Concluída em `testes` — aguarda validação manual |
| 8.2 | Enriquecer o resumo Gemini com descontos, histórico de compras, prazos e precificação | Alta | Concluída em `testes` — aguarda validação manual |
