<div align="center">

# MiauDelier Manager

### Gestão de produção, custos e financeiro para quem trabalha com resina epóxi e moldes de silicone.

[![Version](https://img.shields.io/badge/version-1.1.0-2563EB)](package.json)
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

Versão atual: **v1.1.0** · Idioma: **Português Brasileiro** · Plataforma: **Web (PWA)**

### Estado confirmado em 08/10/2026

- Autenticação por e-mail/senha com confirmação, Google OAuth e vínculo manual de identidades pelo Supabase Auth.
- Dados sincronizáveis trafegam em JSON normal entre o cache IndexedDB e o Supabase; a proteção de acesso é feita por Auth, RLS e HTTPS. Não há cofre, DEK/KEK nem cifra interna de dados de negócio no cliente.
- Cada usuária configura sua própria chave Gemini: ela é enviada somente à Edge Function autenticada, vinculada ao seu `user.id` e não fica persistida no navegador. Não há chave Gemini compartilhada do aplicativo. O resumo do dashboard usa indicadores financeiros, estoque, prazos, descontos e histórico de custos para recomendações factuais.
- O PWA usa ícones próprios MiauDelier, cor de sistema escura e uma tela de abertura breve com versão, Raffa Studio Produções e selo GitGuard.

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
| **Assistente de IA** | Chat e resumo do dashboard via Edge Function Gemini autenticada | ✅ Disponível |

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

Gera o bundle de produção em `dist/`. O app é uma SPA estática — qualquer host de arquivos estáticos serve (Cloudflare Pages, Netlify, GitHub Pages). A branch `testes` possui CI de lint, testes, tipagem, build e publicação do artefato de preview.

## Segurança e privacidade

- Senhas são tratadas exclusivamente pelo Supabase Auth e não são gravadas pelo aplicativo nem em logs.
- O frontend contém apenas a URL e a chave publicável do Supabase; `service_role`, segredos OAuth e a chave Gemini não são expostos nele.
- Acesso remoto é limitado por sessão Supabase, RLS por `user_id`/perfil e HTTPS. O IndexedDB é um cache local sincronizável, sem cifra interna de dados de negócio.
- Backup valida checksum e formato antes de qualquer escrita; arquivos corrompidos ou incompletos não são aplicados parcialmente.
- **Exclusão de Conta e Dados (LGPD/GDPR)**: a exclusão da conta remove os dados em nuvem e a limpeza local remove o cache deste dispositivo.
## Sincronização em Nuvem e Event Sourcing (Fase 7)

A sincronização utiliza um **Ledger (Event Sourcing) local-first**. O cache Dexie registra mudanças e o Supabase recebe eventos JSON protegidos pelas políticas RLS. No login e nas reconexões, o cliente baixa e aplica os eventos autorizados da conta, mantendo os dispositivos sincronizados.
- **Verificação de Integridade Real (Ledger):** Inspirado em sistemas bancários, **o saldo das contas não pode ser modificado arbitrariamente**. A cada ciclo de sincronização ou reinício, o sistema lê todas as *transações* do livro-razão (ledger), recalcula os saldos e corrige forçosamente a tabela de `contas` se detectar que o valor local foi manipulado sem autorização/transação correspondente, gerando uma trilha de auditoria.


## Assinaturas e IA

O MiauDelier Manager é uso proprietário e single-tenant — não há modelo de assinatura nem cobrança dentro do app.

O módulo de IA utiliza Gemini somente quando a usuária configura a própria chave e há internet. A chave vai do formulário autenticado à Edge Function, é vinculada à usuária e não permanece no navegador; não existe fallback compartilhado. O resumo do dashboard limita as recomendações aos números reais do ateliê, incluindo caixa, resultado, prazos, estoque, descontos e histórico de custos; ele não deve inventar tendências externas.

## Documentação

Este README é a fonte pública de verdade sobre o projeto. A documentação de processo (especificação completa, decisões de arquitetura, planos de implementação por fase e checklist de progresso) é mantida internamente pela Raffa Studio Produções, fora deste repositório.

## Roadmap

- [x] Fundação: schema, autenticação Supabase, motores de cálculo, backup
- [x] Segurança de dados: Auth, RLS, HTTPS, sessão reativa e guard de rota
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
