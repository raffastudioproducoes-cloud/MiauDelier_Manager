<div align="center">

# MiauDelier Manager

### Gestão de produção, custos e financeiro para quem trabalha com resina epóxi e moldes de silicone.

[![Version](https://img.shields.io/badge/version-1.0.0-2563EB)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Local-first](https://img.shields.io/badge/Arquitetura-local--first-22C55E)](https://dexie.org)
[![License](https://img.shields.io/badge/license-proprietary-0F172A)](#licença)

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

**MiauDelier Manager** é um aplicativo web (PWA, local-first) para gestão do ateliê da **MiauDelier** e de outros profissionais que trabalham com resina epóxi e moldes de silicone. Reúne cálculo técnico de volume e mistura, precificação real, controle de produção, estoque, clientes/pedidos e financeiro em um único lugar, com todos os dados residindo no dispositivo da usuária.

Versão atual: **v1.0.0** · Idioma: **Português Brasileiro** · Plataforma: **Web (PWA)**

## Objetivo

Transformar o controle manual do ofício de resina em decisões de produção e preço com base em dado real, permitindo à artesã:

- calcular volume e proporção de mistura para qualquer geometria de molde;
- precificar peças considerando material, mão de obra, custo fixo e margem;
- controlar estoque de insumos e moldes;
- acompanhar peças em produção com histórico de eventos;
- gerenciar clientes e pedidos;
- manter o financeiro do ateliê (contas, transações) protegido por senha, mesmo offline;
- exportar e restaurar os dados do negócio a qualquer momento, sem depender de nuvem de terceiros.

## Público-alvo

- Artesãs e artesãos de resina epóxi
- Fabricantes de moldes de silicone
- Pequenos ateliês single-user que precisam separar custo, preço e caixa
- Profissionais que hoje controlam produção e preço em papel ou planilha solta

## Funcionalidades principais

| Módulo | Recursos | Status |
| --- | --- | --- |
| **Autenticação** | Login de usuário único, senha nunca gravada em claro, bloqueio temporário após tentativas erradas | ✅ Disponível |
| **Segurança de dados** | Valor de conta/transação cifrado em repouso (AES-GCM), ilegível sem a senha | ✅ Disponível |
| **Calculadora de volume** | Geometria retangular, cilíndrica, esférica e medida direta; proporções 2:1, 3:1, 1:1 e 100:3; margem de segurança | ✅ Disponível (motor) |
| **Precificação** | Custo direto + mão de obra + rateio fixo + margem → preço sugerido | ✅ Disponível (motor) |
| **Backup** | Exportação/importação em JSON com checksum validado antes de qualquer escrita | ✅ Disponível |
| **Design system e navegação** | Componentes visuais e shell de navegação responsivo | 🔜 Em desenvolvimento |
| **Produção e estoque** | Materiais, formas, peças e ledger de eventos | 🔜 Planejado |
| **Vendas** | Clientes, pedidos e precificação na tela | 🔜 Planejado |
| **Financeiro** | Contas, transações e tela de backup | 🔜 Planejado |
| **Assistente de IA** | Dicas e apoio contextual sobre o ofício (opcional, online-only) | 🔜 Planejado |

## Tecnologias

- **TypeScript 5.8**
- **React 19.2** (SPA, sem servidor de aplicação)
- **TanStack Router** com roteamento por arquivo
- **Vite 8.2** + **Vitest 3** para build e testes
- **Dexie 4.4** sobre **IndexedDB** — persistência 100% local
- **Zustand 5.0** para estado de sessão reativo
- **zod** + **react-hook-form** — validação (a entrar nos formulários das próximas fases)
- **WebCrypto** nativo (PBKDF2-SHA256 600.000 iterações + AES-GCM-256) — sem biblioteca de criptografia externa
- **Testing Library** + **fake-indexeddb** para testes de comportamento real sobre banco simulado

## Arquitetura e estrutura

```text
MiauDelier-Manager/
├── index.html                     # entrada da SPA
├── src/
│   ├── db/schema.ts                # schema Dexie (todas as tabelas do produto, desde a v1)
│   ├── lib/
│   │   ├── auth.ts                 # login de usuário único, bloqueio por tentativas
│   │   ├── crypto.ts                # primitivas WebCrypto (derivação de chave, cifra/decifra)
│   │   ├── camposCifrados.ts       # camada que cifra/decifra campo de domínio usando a sessão
│   │   └── backup.ts                # export/import de backup JSON com checksum
│   ├── stores/authStore.ts         # estado de sessão reativo (Zustand)
│   ├── features/
│   │   ├── auth/                   # tela de login e guard de rota
│   │   ├── calculator/              # motor de volume e proporção de mistura
│   │   ├── pricing/                 # motor de precificação
│   │   └── financeiro/              # repositórios de contas e transações (dado cifrado)
│   ├── routes/                      # rotas por arquivo (TanStack Router)
│   └── router.tsx
└── vitest.config.ts / vite.config.ts
```

Princípios adotados:

- **Local-first**: sem backend próprio, sem API HTTP de negócio, sem servidor de sessão;
- dado sensível cifrado em repouso com chave derivada da senha, nunca persistida;
- toda leitura/escrita de campo cifrado passa por uma única camada (`camposCifrados.ts`) — nenhum acesso direto ao Dexie por fora dela;
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

Não há segredo ou variável de ambiente obrigatória para rodar localmente — o app funciona 100% offline (o módulo de IA, quando existir, será a única exceção, e a chave de API fica configurada pela própria usuária dentro do app, cifrada localmente).

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
- Não existe fluxo de recuperação de senha automatizado — por não haver backend, a única via de recuperação é reimportar um backup anterior. Isso é uma decisão de produto, não uma lacuna.
- Não há telemetria, analytics ou qualquer envio de dado do ateliê para fora do dispositivo, exceto a chamada opcional e explícita ao assistente de IA (quando existir), sempre condicionada a haver internet disponível.

## Assinaturas e IA

O MiauDelier Manager é uso proprietário e single-tenant — não há modelo de assinatura nem cobrança dentro do app.

O módulo de IA é opcional e ainda não está implementado (ver Roadmap). Quando existir: usará a API gratuita do Gemini, só ativa com internet disponível, com instrução de sistema fixa que restringe o assistente ao domínio do ofício (resina, moldes, produção, precificação) — não editável pela usuária. A personalidade de resposta será selecionável entre opções pré-definidas, sem afrouxar essa restrição. A chave de API fica configurada pela própria usuária e é cifrada localmente pela mesma camada de segurança do restante do app.

## Documentação

Este README é a fonte pública de verdade sobre o projeto. A documentação de processo (especificação completa, decisões de arquitetura, planos de implementação por fase e checklist de progresso) é mantida internamente pela Raffa Studio Produções, fora deste repositório.

## Roadmap

- [x] Fundação: schema, criptografia, login, motores de cálculo, backup
- [x] Segurança de dados: cifra de campo financeiro, sessão reativa, guard de rota
- [ ] Design system e shell de navegação
- [ ] Produção e estoque (materiais, formas, peças)
- [ ] Vendas (precificação na tela, clientes, pedidos)
- [ ] Financeiro, tela de backup e PWA instalável
- [ ] Assistente de IA opcional (Gemini)
- [ ] CI de lint/test/build e deploy contínuo

## Licença

Software proprietário © Raffa Studio Produções — MiauDelier Manager.
Uso, cópia, modificação ou distribuição somente com autorização expressa do titular.

## Contato

**Raffa Studio Produções**

E-mail: **raffastudioproducoes@gmail.com**

---

Feito para quem transforma resina em negócio.
