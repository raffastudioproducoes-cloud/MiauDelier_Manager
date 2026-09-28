# Project Memory (MEMORY.md)

Este documento atua como a memória operacional viva do projeto **MiauDelier Manager**, registrando o contexto atual, o progresso acumulado, as decisões técnicas recentes e as notas operacionais para continuidade entre sessões.

---

## 1. Última Atualização

- **Data**: 28/09/2026
- **Horário**: 02:40 (BRT)

---

## 2. Fase Atual

- **Fase Atual**: **Fase 6 — Infraestrutura, PWA e CI/CD**

---

## 3. Status Atual do Projeto

O **MiauDelier Manager** encontra-se em estágio de produção maduro v1.0.0. Todos os módulos principais de domínio (Calculadora de Volume, Precificação, Estoque de Materiais, Formas/Moldes, Peças, Vitrine WhatsApp, Clientes, Pedidos, Financeiro Cifrado, Backup SHA-256 e Resumo de IA) estão 100% desenvolvidos, testados e operacionais.

Recentemente foram concluídas a funcionalidade de captura e seleção de imagens para peças e moldes (via câmera ao vivo com tratamento de permissões ou galeria interna) e a criação da aba **Vitrine - Peças Prontas**, permitindo a geração automática de postagens e atendimento direto no WhatsApp da usuária.

A suíte de testes com **Vitest** possui **315 testes automatizados** (309 testes de componentes/repositórios + 6 testes de integração de imagens) com **100% de aprovação**, e a checagem de tipos com `npx tsc --noEmit` encerra com **0 erros**. O bundle de produção Vite/Rolldown compila com sucesso.

---

## 4. Tarefas Recentemente Concluídas

| ID | Tarefa | Concluída em |
| --- | --- | --- |
| 6.4 | Implementação do registrador de eventos e captura de falhas silenciosas (`src/lib/logger.ts`, `ErrorBoundary`, `/logs`) com sanitização de senhas/chaves | 28/09/2026 |
| 3.6 | Implementação do fluxo de produção de peças por 4 etapas (Molde/Volume Sugerido, Cura/Equipamentos Térmicos, Desmolde/EPIs/Máquinas, Propaganda/Frete & Precificação) | 28/09/2026 |
| 3.4 | Implementação do componente `SeletorImagem` (câmera com permissão/fallback + galeria + compressão Canvas JPEG) | 27/09/2026 |
| 3.5 | Implementação da aba "Vitrine - Peças Prontas" em `PecasPage.tsx` e `VitrinePecasProntas.tsx` (gerador de posts + WhatsApp `wa.me`) | 27/09/2026 |
| 5.2 | Adição de rate-limit de 24h e cache em `localStorage` para o resumo da loja por IA Gemini no Dashboard | 27/09/2026 |
| 4.2 | Inclusão de debounce no slider de progresso do pedido em `PedidoDetalhePage.tsx` | 26/09/2026 |
| 1.4 | Resolução de débitos técnicos e adição de teste de regressão de migração de schema Dexie (`src/db/schema.test.ts`) | 26/09/2026 |

---

## 5. Tarefas em Andamento

| ID | Tarefa | Iniciada em | Previsão |
| --- | --- | --- | --- |
| 6.1 | Refinamento de PWA Service Worker para cache avançado offline | 28/09/2026 | Em breve |
| 6.3 | Adição de GitHub Actions CI para checagem automatizada de lint, tsc e vitest | 28/09/2026 | Em breve |

---

## 6. Decisões Importantes de Arquitetura

1. **Armazenamento de Imagens em Base64 Redimensionado**: As fotos de moldes e peças são comprimidas via Canvas offscreen para no máximo 800×800px a 80% de qualidade JPEG antes de serem armazenadas no IndexedDB (`imagemUrl?: string`). Isso preserva o suporte offline 100% local-first sem depender de buckets S3/Cloud Storage.
2. **Atendimento Direto no WhatsApp (`wa.me`)**: O canal de vendas não exige API paga do WhatsApp Business. Utiliza a sintaxe padrão `https://wa.me/[telefone]?text=[mensagemEncoded]`, permitindo que o cliente final clique no link gerado e abra a conversa direto com o artesão.
3. **Criptografia Financeira Cifrada em Repouso**: Nenhum valor monetário de saldo ou transação é salvo em texto claro no IndexedDB. Apenas a camada `camposCifrados.ts` usando WebCrypto PBKDF2 + AES-GCM-256 tem autoridade para cifra/decifra durante uma sessão ativa.
4. **Resumo por IA com Rate-Limit de 24 Horas**: Para evitar estourar a quota da API do Gemini, o resumo automatizado do ateliê é calculado uma vez por dia e armazenado no `localStorage`. Apenas o clique no botão manual de atualização zera o contador interno.

---

## 7. Notas Operacionais & Instruções para Próximas Sessões

- **Comando de Verificação de Tipos**: `npx tsc --noEmit`
- **Comando de Testes Automatizados**: `npx vitest run`
- **Comando de Build**: `npx vite build`
- **Localização do Vault Obsidian de Apoio**: `C:\Users\rafae\Documents\Obsidian`
