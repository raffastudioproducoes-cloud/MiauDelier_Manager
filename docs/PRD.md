# Documento de Requisitos do Produto (PRD)

**Produto:** MiauDelier Manager  
**Versão:** 1.0.0  
**Data:** 28/09/2026  
**Autor / Equipe:** Raffa Studio Produções / MiauDelier  
**Status:** Em Produção / Ativo  
**Plataforma / Versão-Alvo:** Web Single-Page Application (PWA Local-First)  

---

## 1. Visão Geral do Produto

O **MiauDelier Manager** é um aplicativo web progressivo (PWA), operando no modelo *local-first*, concebido para a gestão integral de ateliês de resina epóxi e fabricação de moldes de silicone. O sistema unifica cálculos técnicos de volume e proporção de mistura, precificação com base em custos reais, controle de estoque de insumos e moldes, acompanhamento do ciclo de vida das peças, cadastro de clientes, gestão de pedidos, ledger financeiro cifrado e divulgação de produtos acabados para venda direta via WhatsApp.

Os dados operacionais residem inicialmente no dispositivo da usuária (IndexedDB via Dexie.js), garantindo operação offline contínua, e são sincronizados ativamente com a nuvem (Supabase) via arquitetura Event Sourcing e criptografia Zero-Knowledge, provendo segurança e disponibilidade.

---

## 2. Declaração do Problema

Artesãs e artesãos que trabalham com resina epóxi e confecção de moldes de silicone enfrentam dificuldades crônicas na gestão de seus ateliês, destacando-se:

1. **Desperdício de Material por Erro de Cálculo**: A resina epóxi e o silicone de cura têm alto custo unitário. Calcular volume de moldes complexos (retangulares, cilíndricos, comedouros pets com vazados ou mesas resinadas com pés) de forma empírica gera sobras desperdiçadas ou falta de resina durante a cura.
2. **Precificação Incorreta e Prejuízo Silencioso**: Ausência de consideração da amortização do tempo de vida útil dos moldes de silicone, consumo exato de energia elétrica dos equipamentos (como câmara de vácuo, canhão térmico e politriz), taxas de cartão/plataforma e valor da hora de mão de obra.
3. **Falta de Visibilidade do Estoque e Produção**: Dificuldade em rastrear a quantidade de silicone usada na fabricação de um molde, amortização por uso do molde, materiais consumidos em cada peça e estorno de insumos em caso de cancelamento.
4. **Venda e Divulgação Desestruturada**: Necessidade de gerar postagens de produtos acabados ("Peças Prontas / Vitrine") para redes sociais e fornecer um canal rápido de atendimento direto no WhatsApp do artesão.
5. **Insegurança e Vulnerabilidade Financeira**: Exposição de dados de contas bancárias e transações financeiras em planilhas ou cadernos físicos, sem proteção por senha ou criptografia em repouso.

---

## 3. Objetivos

- **Precisão Técnica**: Garantir cálculo exato de volume (ml), massa (g/kg) e proporção de mistura de resina/endurecedor (2:1, 3:1, 1:1, 100:3) com margem de segurança ajustável.
- **Precificação Realista**: Calcular o preço de venda sugerido somando custos diretos de materiais, depreciação amortizada do molde por uso, consumo de energia, custo de mão de obra fixa/hora, taxas de venda e margem de lucro desejada.
- **Controle de Estoque e Insumos**: Monitorar materiais e categorias (com suporte a subcategorias), convertendo unidades de medida automaticamente (ex: ml, L, g, kg, un, bisnaga).
- **Rastreabilidade de Moldes e Peças**: Controlar a vida útil dos moldes (usos realizados vs. limite), tempo de cura de silicone/resina, registro de fotos por câmera ou memória interna e histórico de eventos da peça.
- **Vitrine e Canal de Vendas**: Oferecer uma área de vitrine de peças prontas com geração automática de post para redes sociais e botão de compra/atendimento direto no WhatsApp do vendedor.
- **Segurança Local-First**: Cifrar dados financeiros sensíveis no disco (AES-GCM-256 com derivação de chave por PBKDF2) e permitir exportação/importação de backups validados por checksum SHA-256.
- **Assistência por IA (Opcional)**: Fornecer resumo diário de loja e dicas técnicas através da API do Google Gemini com rate-limiting de 24 horas.

---

## 4. Usuários-Alvo

- **Artesãs e Artesãos de Resina Epóxi**: Profissionais que produzem chaveiros, bandejas, mesas resinadas, eternizações e peças decorativas.
- **Fabricantes de Moldes de Silicone**: Artesãos que criam e vendem moldes próprios ou produzem matrizes para uso interno no ateliê.
- **Pequenos Ateliês Single-User**: Negócios individuais que necessitam organizar estoque, fluxo de caixa e pedidos sem complexidade de sistemas empresariais corporativos.

---

## 5. Principais Funcionalidades / MVP

### 5.1. Funcionalidades do MVP (Concluídas e Operacionais)

- **Autenticação, Proteção de Perfil & Nuvem (Fase 7)**:
  - Arquitetura Híbrida: Login Social (Google/Apple) e Email+OTP (5 min) via Supabase Auth.
  - Multi-tenancy isolado: Suporte a até 10 perfis independentes por Conta de Usuário (`user_id`).
  - Segurança Zero-Knowledge: Cofre cifrado com PBKDF2 e AES-GCM-256. Mesmo logado via OAuth, o usuário deve informar a **Senha do Cofre** para descriptografar os dados.
  - Mesclagem de Contas: Permite unificar conta local/senha com identidade Google/Apple, confirmando a senha do cofre atual na área restrita.
- **Calculadora de Volume & Proporção de Mistura**:
  - Suporte a geometrias: Retangular, Cilíndrica, Esférica e Medida Direta.
  - Suporte a furos/vazados (ex: comedouros pets) e pés de mesa resinados.
  - Proporções pré-configuradas (2:1, 3:1, 1:1, 100:3) e calculador de resina + catalisador.
- **Gestão de Estoque & Categorias**:
  - Categorias principais e subcategorias hierárquicas.
  - Conversão de unidades de medida (massa, volume, unidade).
  - Alertas visuais para itens com estoque zerado ou baixo.
- **Gestão de Moldes / Formas**:
  - Cálculo de silicone utilizado e débito automático no estoque.
  - Cálculo de caixa de contenção/estrutura externa (MDF, madeira, acrílico).
  - Controle de vida útil (usos realizados / total) e amortização por peça.
  - Controle de tempo de cura do molde com notificação ao concluir.
  - Captura e anexo de imagens (via câmera ao vivo com solicitação de permissão ou galeria).
- **Gestão de Peças & Produção por Etapas**:
  - Cadastro de peça guiado por 4 etapas reais de ateliê (Molde & Resina Inicial, Cura & Equipamentos Térmicos, Desmolde & Acabamento com EPIs/Água, e Comercial/Propaganda/Frete).
  - Exibição em destaque do **Volume Média Sugerido pela Forma** com conversão inteligente e automática de unidades (exibe em **Litros / kg** para volumes >= 1000 ml / 1 kg, ex: **10,9 L (~12,0 kg resina)** ou **2,5 L (~2,75 kg resina)**, e em **ml / g** para volumes < 1000 ml / 1 kg, ex: **500 ml (~550 g resina)**).
  - Consumo de equipamentos elétricos de cura (soprador térmico, estufa, câmara de vácuo) e acabamento (lixadeira, politriz, furadeira).
  - Custo de horas de mão de obra ativa, água e consumíveis/EPIs (luvas, máscaras, lixas).
  - Confirmado no motor de precificação que a **amortização do molde entra somada ao custo total da peça**.
  - Rateio proporcional de investimento em propaganda por dias de anúncio (ex: R$ 30 por 30 dias = R$ 1/dia por peça).
  - Inserção de valor integral de frete/embalagem individual.
  - Geração automática de número de série (`#0001`), débito de materiais e linha do tempo de eventos.
  - Atualização de status (`planejada`, `em_producao`, `curando`, `acabamento`, `pronta`, `vendida`, `cancelada`).
- **Vitrine de Peças Prontas & Vendas WhatsApp**:
  - Aba exclusiva filtrando produtos acabados e não vendidos (`status === 'pronta'`).
  - Cards estilo post para redes sociais com foto, preço e código de série.
  - Gerador de texto formatado para publicação em redes sociais.
  - Botão **Compartilhar no WhatsApp** abrindo conversa direta com o vendedor (`wa.me`) com mensagem preenchida.
  - Configuração do WhatsApp da loja/vendedor.
  - Suporte a compartilhamento nativo (`navigator.share`).
- **Clientes e Pedidos**:
  - Cadastro de clientes e vinculo com peças.
  - Atualização do progresso da produção do pedido com salvamento em debounce.
  - Conversão automática de peça para "vendida" criando transação financeira de entrada.
- **Precificação & Custos Fixos**:
  - Cadastro de equipamentos (potência Watts) e cálculo de consumo de energia.
  - Cadastro de taxas fixas e percentuais (cartão, plataforma de vendas).
  - Cálculo automático de custo total e preço sugerido com margem de lucro.
- **Financeiro Cifrado**:
  - Cadastro de contas bancárias e transações de entrada/saída.
  - Criptografia AES-GCM em repouso dos saldos e valores de transação.
- **Resumo Inteligente por IA (Gemini)**:
  - Resumo automatizado das métricas do ateliê.
  - Controle interno de rate-limit de 24 horas no `localStorage` com botão de atualização manual.
  - Suporte a chave API Gemini configurável e cifrada.
- **Logger de Eventos & Captura de Falhas Silenciosas**:
  - Módulo de logging centralizado (`src/lib/logger.ts`) com captura automática de exceções globais (`window.onerror`), rejeições de Promise (`window.onunhandledrejection`) e falhas de renderização no React (`ErrorBoundary`).
  - Higienização e sanitização estrita: omite automaticamente senhas, hashes, chaves de criptografia hex de 256-bit, tokens, payloads cifrados e dados sensíveis.
  - Tela dedicada de inspeção de logs (`/logs`) com filtros por nível (`info`, `warn`, `error`, `debug`), busca por termo, exportação em arquivos `.txt` e `.json` e botão de limpeza local.
- **Segurança, Backup & Registro de Auditoria**:
  - Exportação e importação de arquivo de backup JSON com verificação de checksum SHA-256.
  - Registro de auditoria imutável para exclusões, alterações de preço e vendas.

### 5.2. Funcionalidades Futuras (Roadmap)

- **Instalador PWA Completo & Notifications Push**: Registro avançado de Service Worker para alertas nativos do SO ao concluir cura de peças/moldes.
- **Integração CI/CD**: Pipeline automatizado de lint, testes e build para deploy contínuo em páginas estáticas. (Concluído)
- **Fase 7 - Cloud e Autenticação (Supabase)**: O modelo híbrido com sincronização em nuvem via Supabase (PostgreSQL) está **concluído**. Login social via Google, Email + OTP, mesclagem segura de perfis e a sincronização bidirecional robusta (Dexie ↔ Supabase via arquitetura Event Sourcing com validação Ledger) estão implementados e operacionais.
