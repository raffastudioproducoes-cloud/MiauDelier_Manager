<div align="center">

# MiauDelier Manager

### Gestão de produção, custos e financeiro para quem trabalha com resina epóxi e moldes de silicone.

[![Version](https://img.shields.io/badge/version-1.0.0-2563EB)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Local-first](https://img.shields.io/badge/Arquitetura-local--first-22C55E)](https://dexie.org)
[![License](https://img.shields.io/badge/license-proprietary-0F172A)](#licença)
[![Secured by GitGuard](https://img.shields.io/badge/Secured%20by-GitGuard-success?style=flat-square)](https://www.gitguard.com.br/raffastudioproducoes-cloud)

</div>

---

## Sumário

1. [Apresentação](#apresentação)
2. [Objetivo](#objetivo)
3. [Público-alvo](#público-alvo)
4. [Funcionalidades principais](#funcionalidades-principais)
5. [Tecnologias](#tecnologias)
6. [Arquitetura e estrutura](#arquitetura-e-estrutura)
7. [Configuração do ambiente](#configuração-do-ambiente)
8. [Desenvolvimento e testes](#desenvolvimento-e-testes)
9. [Build e distribuição](#build-e-distribuição)
10. [Segurança e privacidade](#segurança-e-privacidade)
11. [Assinaturas e IA](#assinaturas-e-ia)
12. [Documentação](#documentação)
13. [Roadmap](#roadmap)
14. [Licença](#licença)
15. [Contato](#contato)

---

## Apresentação

**MiauDelier Manager** é um aplicativo web (PWA, local-first) para gestão do ateliê da **MiauDelier** e de outros profissionais que trabalham com resina epóxi e moldes de silicone. Reúne cálculo técnico de volume e mistura, precificação real, controle de produção, estoque, clientes/pedidos e financeiro em um único lugar. Os dados residem primeiro no dispositivo da usuária e sincronizam na nuvem via Event Sourcing.

Versão atual: **v1.0.0** · Idioma: **Português Brasileiro** · Plataforma: **Web (PWA)**

## Objetivo

Transformar o controle manual do ofício de resina em decisões de produção e preço com base em dado real, permitindo à artesã:

- calcular volume e proporção de mistura para qualquer geometria de molde;
- precificar peças considerando material, mão de obra, custo fixo e margem;
- controlar estoque de insumos e moldes;
- acompanhar peças em produção com histórico de eventos;
- gerenciar clientes e pedidos;
- manter o financeiro do ateliê (contas, transações) protegido por Supabase Auth, RLS e HTTPS;
- exportar e restaurar os dados, além de contar com sincronização na nuvem (Supabase).

## Público-alvo

- Artesãs e artesãos de resina epóxi
- Fabricantes de moldes de silicone
- Pequenos ateliês single-user que precisam separar custo, preço e caixa
- Profissionais que hoje controlam produção e preço em papel ou planilha solta

## Funcionalidades principais

| Módulo | Recursos | Status |
| --- | --- | --- |
| **Autenticação** | Login de usuário único, senha nunca gravada em claro, bloqueio temporário após tentativas erradas | ✅ Disponível |
| **Segurança de dados** | Supabase Auth, políticas RLS e HTTPS para cada conta | ✅ Disponível |
| **Calculadora de volume** | Geometria retangular, cilíndrica, esférica e medida direta; proporções 2:1, 3:1, 1:1 e 100:3; margem de segurança | ✅ Disponível (motor) |
| **Precificação** | Motor de precificação inteligente (Custo direto + mão de obra + rateio fixo + margem → preço sugerido) | ✅ Disponível |
| **Backup** | Exportação/importação em JSON com checksum validado antes de qualquer escrita | ✅ Disponível |
| **Design system e navegação** | Componentes visuais e shell de navegação responsivo adaptável | ✅ Disponível |
| **Produção e estoque** | Controle de materiais, formas, peças e ledger imutável de eventos/consumo | ✅ Disponível |
| **Vendas** | Gerenciamento de clientes, controle de pedidos e orçamentos na tela | ✅ Disponível |
| **Financeiro** | Contas bancárias e transações via ledger verificado | ✅ Disponível |
| **Assistente de IA** | Integração aguardando API segura no backend | ⏳ Pendente |

## Tecnologias

- **TypeScript 5.8**
- **React 19.2** (SPA local-first integrada ao Supabase)
- **TanStack Router** com roteamento por arquivo
- **Vite 8.2** + **Vitest 3** para build e testes
- **Dexie 4.4** sobre **IndexedDB** — persistência local-first sincronizada via Event Sourcing
- **Zustand 5.0** para estado de sessão reativo
- **zod** + **react-hook-form** — validação (a entrar nos formulários das próximas fases)
- **Testing Library** + **fake-indexeddb** para testes de comportamento real sobre banco simulado

## Arquitetura e estrutura

```text
MiauDelier-Manager/
├── index.html                     # entrada da SPA
├── src/
│   ├── db/schema.ts                # schema Dexie (todas as tabelas do produto, desde a v1)
│   ├── lib/
│   │   ├── auth.ts                 # login de usuário único, bloqueio por tentativas
│   │   └── backup.ts                # export/import de backup JSON com checksum
│   ├── stores/authStore.ts         # estado de sessão reativo (Zustand)
│   ├── features/
│   │   ├── auth/                   # tela de login e guard de rota
│   │   ├── calculator/              # motor de volume e proporção de mistura
│   │   ├── pricing/                 # motor de precificação
│   │   └── financeiro/              # repositórios de contas e transações
│   ├── routes/                      # rotas por arquivo (TanStack Router)
│   └── router.tsx
└── vitest.config.ts / vite.config.ts
```

Princípios adotados:

- **Local-first**: os dados vivem primeiro no dispositivo e são sincronizados via Event Sourcing com o backend (Supabase);
- a proteção de acesso é responsabilidade do Supabase Auth, RLS e HTTPS;
- o IndexedDB funciona como cache local de dados sincronizáveis, sem chaves ou cifras internas;
- schema de banco cobre todos os módulos do produto desde a primeira versão, para nunca precisar de migração dolorosa;
- backup nunca escreve no banco sem validar checksum e formato antes.

## Configuração do ambiente

Requisitos:

- Node.js 20+
- npm

Clone o repositório:

```bash
git clone https://github.com/raffastudioproducoes-cloud/MiauDelier_Manager.git
cd MiauDelier_Manager
npm install
```

Para rodar com sincronização de nuvem, configure `VITE_SUPABASE_URL` e a chave publicável `VITE_SUPABASE_ANON_KEY` no `.env.local`. Nunca use `service_role` ou chaves de provedores no frontend.

## Desenvolvimento e testes

```bash
npm run dev          # servidor de desenvolvimento (Vite)
npm test             # roda toda a suíte (Vitest)
npm run test:watch   # suíte em modo observação
```

Antes de qualquer commit, rode também a checagem de tipos:

```bash
npx tsc --noEmit
```

## Build e distribuição

```bash
npm run build
```

Gera o bundle de produção em `dist/`. O app é uma SPA estática — qualquer host de arquivos estáticos serve (Cloudflare Pages, Netlify, GitHub Pages). Deploy contínuo (CI) ainda não está configurado; é item do roadmap.

## Segurança e privacidade

- Senha nunca é gravada em texto puro nem em log — só um verificador cifrado e o salt ficam persistidos.
- Chave de criptografia é derivada da senha (PBKDF2 600.000 iterações) e vive só em memória, nunca é salva.
- Valor de conta e de transação é cifrado (AES-GCM) antes de tocar o disco; sem sessão aberta, a camada de cifra recusa ler ou escrever.
- Login bloqueia temporariamente (backoff crescente) após 5 tentativas erradas seguidas, persistido no dispositivo — sobrevive a recarregar a página.
- Backup exportado/importado valida checksum e formato do envelope antes de qualquer escrita no banco; um arquivo corrompido ou incompleto nunca é aplicado parcialmente.
- Não existe fluxo de recuperação da senha-mestre local (Cofre), que é responsável por cifrar os dados. A plataforma usa autenticação na nuvem (Google/Email), mas a senha do Cofre local não pode ser recuperada remotamente (decisão Zero-Knowledge).
- Os dados do ateliê são sincronizados, porém cifrados localmente antes do envio, garantindo privacidade ponta a ponta. O assistente de IA usa uma conexão direta protegida.
- **Exclusão de Conta e Dados (LGPD/GDPR)**: O usuário possui total autonomia para excluir todos os seus dados em nuvem, expurgar seus bancos de dados locais e realizar a exclusão irreversível da sua conta (Supabase Auth, vínculos Google/Apple e chaves) com um único clique.
## Sincronização em Nuvem e Event Sourcing (Fase 7)

A partir da versão que inclui suporte à nuvem, a sincronização de dados funciona com base em um **Ledger (Event Sourcing) local-first**:
- **Imutabilidade e Append-Only:** Os dados não são simplesmente atualizados no Supabase. O banco de dados remoto age como um *log cego*, registrando apenas os eventos (criação, edição e exclusão) cifrados pela chave local da usuária. O servidor remoto nunca tem a chave para ler os dados, garantindo privacidade *Zero-Knowledge*.
- **Verificação de Integridade Real (Ledger):** Inspirado em sistemas bancários, **o saldo das contas não pode ser modificado arbitrariamente**. A cada ciclo de sincronização ou reinício, o sistema lê todas as *transações* do livro-razão (ledger), recalcula os saldos e corrige forçosamente a tabela de `contas` se detectar que o valor local foi manipulado sem autorização/transação correspondente, gerando uma trilha de auditoria.


## Assinaturas e IA

O MiauDelier Manager é uso proprietário e single-tenant — não há modelo de assinatura nem cobrança dentro do app.

O módulo de IA utiliza a API gratuita do Gemini, sendo ativado somente com internet disponível, e possui restrição instrucional fixa ao domínio do ofício (resina, moldes, produção, precificação). A chave de API fica configurada pela própria usuária e é cifrada localmente pela mesma camada de segurança do restante do app.

## Documentação

Este README é a fonte pública de verdade sobre o projeto. A documentação de processo (especificação completa, decisões de arquitetura, planos de implementação por fase e checklist de progresso) é mantida internamente pela Raffa Studio Produções, fora deste repositório.

## Roadmap

- [x] Fundação: schema, criptografia, login, motores de cálculo, backup
- [x] Segurança de dados: cifra de campo financeiro, sessão reativa, guard de rota
- [x] Design system e shell de navegação
- [x] Produção e estoque (materiais, formas, peças)
- [x] Vendas (precificação na tela, clientes, pedidos)
- [x] Financeiro, tela de backup e PWA instalável
- [x] Assistente de IA opcional (Gemini)
- [x] CI de lint/test/build e deploy contínuo
- [x] Fase 7: Autenticação em nuvem (Google/Email) e Sincronização com Supabase (Motor Event Sourcing Dexie <-> Supabase concluído!)

## Licença

Software proprietário © Raffa Studio Produções — MiauDelier Manager.
Uso, cópia, modificação ou distribuição somente com autorização expressa do titular.

## Contato

**Raffa Studio Produções**

E-mail: **raffastudioproducoes@gmail.com**

---

Feito para quem transforma resina em negócio.
