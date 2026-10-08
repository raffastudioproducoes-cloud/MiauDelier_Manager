# Auditoria de Segurança e Conformidade (AppSec & Red Team)

Este documento apresenta a auditoria estática de segurança do **MiauDelier Manager**, baseada no estado atual da aplicação (PWA híbrida com sincronização via Supabase PostgreSQL/Auth). Atualizado em 08/10/2026.

> **Decisão vigente:** dados de negócio não são cifrados internamente no frontend ou IndexedDB. A proteção definida é Supabase Auth, RLS, HTTPS e controle de segredos no backend/Edge Functions. Referências históricas a DEK, KEK, cofre local e `camposCifrados` abaixo não representam a arquitetura vigente.

---

## 1. Proteção das Rotas de API (Autenticação e Autorização)
- **Estado Atual (Local-first):** O aplicativo é um PWA (Single Page Application). A proteção de "rotas" ocorre no frontend via React Router (ex: `RequireAuth`). Não existem rotas de backend tradicionais, logo não há exposição de API REST clássica. A segurança de acesso aos dados é garantida pelo isolamento do navegador (Same-Origin Policy).
- **Proteção Nuvem (Fase 7):** A proteção do backend é garantida pelo Supabase com Row Level Security (RLS) no PostgreSQL validando os tokens JWT (`auth.uid() = user_id`), prevenindo ataques como BOLA/IDOR (Broken Object Level Authorization).
- **Veredito / Ação:** **Conforme e Implementado.** O acesso aos dados em nuvem está devidamente restrito por tenant.

## 2. Criptografia de Senhas no Banco de Dados
- **Estado atual:** senhas são processadas pelo Supabase Auth e não são armazenadas pelo aplicativo em texto ou logs.
- **Supabase:** a autenticação remota é delegada ao **Supabase Auth**; o aplicativo usa a sessão emitida para acessar apenas dados autorizados pelas políticas RLS.
- **Veredito / Ação:** **Seguro e Conforme.**

## 3. Rate Limiting (Proteção contra Força Bruta)
- **Estado Atual (Local-first):** A aplicação implementa um bloqueio temporário de tentativas no gerenciador de login local (`src/lib/auth.ts`) após múltiplos erros.
- **Fase 7 (Supabase):** O Supabase Auth possui mecanismos automatizados nativos e invisíveis de _Rate Limiting_, mitigação de _Credential Stuffing_ e proteção de APIs via infraestrutura Cloudflare.
- **Veredito / Ação:** **Seguro e Conforme.** A delegação da autenticação para o Supabase aumentou significativamente a barreira defensiva.

## 4. Políticas de Row Level Security (RLS)
- **Contexto:** A Fase 7 do MiauDelier utilizará **Supabase (PostgreSQL)**. O conceito essencial de segurança para este caso é o **Row Level Security (RLS)** nativo do banco relacional.
- **Estado Atual (Local-first):** Não se aplica (IndexedDB é unicamente local e isolado por domínio).
- **Fase 7 (Supabase):** 
- **Veredito / Ação:** **Ponto de Atenção Crítico para Fase 7.** O banco de dados em nuvem deverá ser provisionado com regras estritas garantindo o acesso isolado por _tenant_ (usuário). Regra mandatória a ser criada para cada tabela:
  ```sql
  CREATE POLICY "Isolamento por usuário"
  ON tabela
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  ```

## 5. Criptografia de Dados Pessoais e Sensíveis
- **Estado atual:** o IndexedDB serve como cache local sem cifra interna dos dados de negócio. O frontend não guarda `service_role`, segredo OAuth ou chave Gemini.
- **Supabase:** dados remotos são autorizados por RLS e trafegam por HTTPS. A chave Gemini de cada usuária é tratada pela Edge Function, vinculada ao respectivo `user.id`, sem fallback compartilhado e sem devolução ao navegador.
- **Veredito / ação:** manter políticas RLS, revisão de RPC/Edge Functions e tratamento de segredos como controles obrigatórios. Não reintroduzir a camada local DEK/KEK.

## 6. Sanitização de Input e Bloqueio de Scripts (Anti-XSS/Injection)
- **Estado Atual (Local-first):** 
  - **XSS:** O React escapa automaticamente as variáveis injetadas via JSX (`{variavel}`). Além disso, a análise do pacote de build revelou a presença do pacote `dompurify` (`purify.es`), indicando que entradas HTML brutas (se houverem) estão sendo higienizadas com segurança.
  - **SQL Injection:** Impossível no front, pois IndexedDB (Dexie) não opera via SQL.
- **Fase 7 (Supabase):** O cliente `@supabase/supabase-js` utiliza prepared statements por baixo dos panos na API REST (PostgREST), o que previne completamente o risco de injeção de SQL direto vindo do front-end.
- **Veredito / Ação:** **Seguro e Conforme.** 

---

### Resumo do Plano de Ação para a Fase 7
Para garantir que a transição para a nuvem não introduza falhas, a engenharia de segurança determina os seguintes requisitos para a Fase 7:
1. **Regras de Segurança Estritas (RLS multi-tenant):** Nenhuma tabela do PostgreSQL no Supabase pode ficar pública. O RLS deve verificar `auth.uid() = user_id` E o aplicativo deve isolar as visões pelo `perfil_id`, garantindo suporte seguro para até 10 perfis por usuário.
2. **Dados de negócio sem cifra interna:** Não reintroduzir AES-GCM, DEK/KEK ou Senha do Cofre no navegador. A proteção aprovada é Supabase Auth, RLS, HTTPS e controle de segredos nas Edge Functions.
3. **Mesclagem Segura de Contas:** Ao vincular um login social (Google/Apple), a mesclagem deve ocorrer apenas para uma sessão já autenticada e usar o fluxo de *manual linking* do Supabase.
4. **Email Verificado (OTP):** Contas novas criadas sem provedores OAuth devem utilizar e-mail válido com verificação de posse por OTP de 5 minutos, sem usar senhas em claro trafegadas ao backend.

## 7. Conformidade com LGPD/GDPR (Direito ao Esquecimento)
- **Estado Atual:** Em total conformidade. O aplicativo possui fluxos explícitos e sem fricção para exclusão de dados e contas.
- **Mecanismos Implementados:**
  - **Exclusão de Dados (Zerar):** O usuário pode limpar toda a sua base de dados (faturas, peças, clientes) do perfil local e, simultaneamente, disparar um evento (via RPC `delete_user_data()`) que apaga o registro remoto, sem destruir a própria conta na nuvem.
  - **Exclusão de Conta (Delete Account):** Ao excluir o perfil principal na aba de Perfil, o aplicativo aciona a exclusão integral da conta no Auth do Supabase (via RPC `delete_user_account()`). Esse gatilho desencadeia cascatas (`ON DELETE CASCADE`) que destroem o vinculo OAuth, senhas, `user_keys` e toda a infraestrutura `sync_events` e metadados. Adicionalmente, todos os bancos de dados locais IndexedDB e `localStorage` são expurgados no mesmo evento.
- **Veredito / Ação:** **Seguro e Conforme.** As garantias de Direito ao Esquecimento foram asseguradas nas pontas do cliente (aparelho) e do servidor (Supabase).
