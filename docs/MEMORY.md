# Project Memory (MEMORY.md)

Este documento atua como a memória operacional viva do projeto **MiauDelier Manager**, registrando o contexto atual, o progresso acumulado, as decisões técnicas recentes e as notas operacionais para continuidade entre sessões.

---

## 1. Última Atualização

- **Data**: 08/10/2026
- **Horário**: 04:15 (BRT)

Atualização 04/11/2026: formas retangulares usam fluxo por fases, caixa obrigatória e margem de silicone de 8% a 12%; a quantidade calculada é convertida à unidade do estoque. Testes direcionados, TypeScript, lint e build aprovados; validação visual no site de testes pendente. A execução anterior da suíte completa teve uma falha no teste de navegação do login Supabase.

Versão 1.2.0: funcionalidade aditiva de cálculo e cadastro guiado de moldes. Auditoria de produção em 04/11/2026 identificou três pacotes com alertas: dompurify (crítico), seroval e zod (altos). Avaliação e correção permanecem pendentes e fora do escopo dos moldes.

O commit `58d8abb` passou na suíte completa, lint, tipos e build no GitHub Actions, com publicação concluída no GitHub Pages. A branch `testes` e o endereço Cloudflare de testes não foram atualizados por esse push; a validação visual continua pendente.

Versão 1.2.1: o custo de silicone usado é persistido no molde e somado ao custo da caixa; cada peça recebe o custo de fabricação dividido pela vida útil. Na edição o estoque é ajustado pela diferença; ao trocar de material devolve-se o anterior e consome-se o novo em uma transação. Para registros antigos sem custo de silicone separado, usa-se o custo de fabricação anterior menos o custo da caixa como estimativa histórica.

Validação 1.2.1: 27 testes direcionados, checagem de tipos, lint e build aprovados. A suíte completa local teve 349 testes aprovados e uma falha intermitente preexistente no teste de navegação do login; aguardar resultado da esteira. Auditoria de dependências manteve os alertas da tarefa 8.5.

Versão 1.2.2: forma antiga pode ter quantidade salva sem baixa real; ao editar, uma confirmação explícita regulariza o consumo uma vez, com registro da confirmação na própria forma. Não se presume que todos os registros antigos estejam pendentes, para evitar débito em duplicidade.

Correção 1.2.3: o usuário esclareceu que os furos da mesa são vazados e preenchidos com silicone. A fórmula anterior que supunha insertos de madeira foi substituída por caixa interna − (tampo maciço − furos). Os furos atravessam a espessura completa no cálculo do silicone; a profundidade informada continua usada no cálculo de resina. Quantidades reais já registradas e saldos não são alterados automaticamente.

---

## 2. Fase Atual

- **Fase Atual**: **Fase 7 — Cloud, Sincronização e Autenticação Social**

---

## 3. Status Atual do Projeto

O **MiauDelier Manager** está em v1.1.0 e possui os módulos principais de cálculo, precificação, estoque, formas, peças, clientes, pedidos, financeiro, backup, IA, autenticação e sincronização. A branch `testes` é a via padrão para validação humana antes de qualquer merge para `main`.

Em 08/10/2026, o dashboard passou a fornecer ao Gemini dados de caixa, resultado do mês, pedidos vencidos, peças sem preço, descontos de compras em 90 dias e variação entre as duas últimas compras de materiais. O modelo é instruído a usar somente esses fatos e declarar quando falta histórico. O cache do resumo é invalidado pela assinatura dos dados e o botão Atualizar força nova consulta.

O PWA recebeu ícones MiauDelier para Android, `theme_color`/`background_color` escuros e uma tela inicial breve com marca, versão, Raffa Studio Produções e selo GitGuard. A validação manual no Android permanece pendente.

O Gemini usa exclusivamente a chave cadastrada pela própria usuária: a Edge Function autenticada a associa ao `user.id` no Vault do Supabase e não possui fallback de chave compartilhada do aplicativo. A chave nunca é persistida no navegador.

Recentemente foram concluídas a funcionalidade de conversão de volume e massa sugerida (Litros e kg para volumes >= 1L; ml e g para volumes < 1L em pt-BR), o seletor flexível de tempo de cura (Dias, Horas, Minutos), o suporte a tempo de uso de equipamentos (minutos, horas, dias), o cronômetro de cura ao vivo com barra de progresso em tempo real, notificações ao concluir sem alteração forçada do status `curando`, e o modal **"➕ Adicionar Tempo de Cura"**.

A suíte de testes com **Vitest** possui **326 testes automatizados** distribuídos em **73 arquivos de teste** com **100% de aprovação**, e a checagem de tipos com `npx tsc --noEmit` encerra com **0 erros**. O bundle de produção Vite/Rolldown compila com sucesso.

---

## 4. Tarefas Recentemente Concluídas

| ID | Tarefa | Concluída em |
| --- | --- | --- |
| 7.1 | Configuração do Supabase CLI, Schema (PostgreSQL + RLS) e adição da coluna `perfil_id` em todo o DB para multi-tenancy | 29/09/2026 |
| 7.2 | Implementação de autenticação por Google via Supabase Auth | 29/09/2026 |
| 7.3 | Implementação de Autenticação via Email com confirmação OTP de 5 minutos | 29/09/2026 |
| 6.1 | Refinamento de PWA Service Worker para cache avançado offline e execução PWA 100% | 29/09/2026 |
| 3.9 | Implementação de abas de divisão do estoque por tipo de material (`INSUMO`, `FERRAMENTA`, `ADMINISTRATIVO`, `EPI`) mantendo subcategorias flexíveis | 28/09/2026 |
| 3.8 | Implementação do cronômetro de cura em tempo real com contagem regressiva viva, barra de progresso, notificação ao finalizar sem alteração forçada de status e extensão de tempo ("➕ Adicionar Tempo de Cura") | 28/09/2026 |
| 2.4 | Criação da função de formatação de volume e massa legível (`formatarVolumeEMassaLegivel`) convertendo volumes >= 1L para `L` e `kg resina` (ex: `10,9 L (~12,0 kg resina)`), e unidades flexíveis para tempo de cura e equipamentos (Dias/Horas/Minutos) | 28/09/2026 |
| 6.4 | Implementação do registrador de eventos e captura de falhas silenciosas (`src/lib/logger.ts`, `ErrorBoundary`, `/logs`) com sanitização de senhas/chaves | 28/09/2026 |
| 3.6 | Implementação do fluxo de produção de peças por 4 etapas (Molde/Volume Sugerido, Cura/Equipamentos Térmicos, Desmolde/EPIs/Máquinas, Propaganda/Frete & Precificação) | 28/09/2026 |
| 3.4 | Implementação do componente `SeletorImagem` (câmera com permissão/fallback + galeria + compressão Canvas JPEG) | 27/09/2026 |
| 3.5 | Implementação da aba "Vitrine - Peças Prontas" em `PecasPage.tsx` e `VitrinePecasProntas.tsx` (gerador de posts + WhatsApp `wa.me`) | 27/09/2026 |
| 5.2 | Adição de rate-limit de 24h e cache em `localStorage` para o resumo da loja por IA Gemini no Dashboard | 27/09/2026 |

---

## 5. Tarefas em Andamento

| ID | Tarefa | Iniciada em | Previsão |
| --- | --- | --- | --- |
| 6.1 | Refinamento de PWA Service Worker para cache avançado offline | 28/09/2026 | Em breve |

---

## 6. Decisões Importantes de Arquitetura

1. **Gestão Não-Intrusiva do Status de Cura**: Quando o tempo de cura de uma peça é concluído, o sistema emite uma notificação em tempo real ("Cura Concluída! 🧪") e destaca o badge na interface, mas **NÃO altera forçadamente o status para `pronta`**. O controle permanece 100% com o artesão/usuário para inspecionar a peça no ateliê, adicionar mais tempo de cura se necessário, ou mover manualmente para desmolde/acabamento.
2. **Formatação Dinâmica de Volume e Massa**: Formatação pt-BR com vírgula decimal para volumes resinados: se `>= 1000 ml`, exibe em `L` e `kg resina` (densidade média ~1.1g/cm³); se `< 1000 ml`, exibe em `ml` e `g resina`.
3. **Armazenamento de Imagens em Base64 Redimensionado**: As fotos de moldes e peças são comprimidas via Canvas offscreen para no máximo 800×800px a 80% de qualidade JPEG antes de serem armazenadas no IndexedDB (`imagemUrl?: string`). Isso preserva o suporte offline 100% local-first sem depender de buckets S3/Cloud Storage.
4. **Segurança no backend:** dados de negócio não possuem cifra interna no navegador. O acesso remoto depende de Supabase Auth, RLS e HTTPS; o IndexedDB é cache de sincronização.
5. **Evolução híbrida:** Supabase fornece banco, Auth, RLS, Edge Functions e sincronização. Google está ativo; Apple permanece futuro enquanto o provedor não estiver configurado.
6. **Fluxo de autenticação:** a tela inicial é login. E-mail inexistente segue para cadastro; uma conta vinculada a Google/Apple permanece no login e orienta o uso do provedor correspondente. Após confirmação de e-mail, o usuário retorna ao login e entra com a credencial confirmada.

---

## 7. Notas Operacionais & Instruções para Próximas Sessões

- **Comando de Verificação de Tipos**: `npx tsc --noEmit`
- **Comando de Testes Automatizados**: `npx vitest run`
- **Comando de Build**: `npx vite build`
- **Localização do Vault Obsidian de Apoio**: `https://github.com/raffastudioproducoes-cloud/RaffaStudio-Vault`
- **Diretório Local do Projeto**: `G:\.shortcut-targets-by-id\181ELvcABCaCM1Gik13jlEQ4ERpBRwO9o\Projetos\MiauDelier Manager`
# Atualização 08/10/2026 — Chave Gemini por Usuária

- A chave Gemini de cada usuária permanece exclusivamente no Vault do Supabase, vinculada ao `user.id`; o frontend nunca lê seu valor e não há chave compartilhada do servidor.
- A tela **Configurações** consulta a Edge Function para exibir `desconectado`, `com problema` ou `conectado`. A consulta verifica o acesso ao modelo sem gerar conteúdo.
- Quando existe uma chave persistida, o campo fica bloqueado. A remoção apaga o vínculo e o segredo do Vault pelo gatilho do banco; só então uma nova chave pode ser cadastrada.

# Atualização 04/11/2026 — Rascunhos e validade de sessão

- Requisito aprovado: salvar automaticamente rascunhos dos formulários de negócio no IndexedDB, isolados por usuário/perfil e sem sincronizar rascunhos.
- Senhas, tokens, chaves privadas, arquivos e segredos ficam fora dos rascunhos.
- Encerrar sessão Supabase na próxima abertura quando o site ficou sete dias ou mais sem ser aberto; aberturas dentro do limite renovam a data local.
- Tarefa 8.3 concluída e validada: 332 testes em 76 arquivos, checagem TypeScript, lint e build aprovados.
