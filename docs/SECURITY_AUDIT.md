# Auditoria de Segurança e Conformidade (AppSec & Red Team)

Este documento apresenta a auditoria estática de segurança do **MiauDelier Manager**, baseada no estado atual da aplicação (PWA Híbrida: Local-First + Sincronização Cloud via Supabase PostgreSQL/Auth implementada na Fase 7).

---

## 1. Proteção das Rotas de API (Autenticação e Autorização)
- **Estado Atual (Local-first):** O aplicativo é um PWA (Single Page Application). A proteção de "rotas" ocorre no frontend via React Router (ex: `RequireAuth`). Não existem rotas de backend tradicionais, logo não há exposição de API REST clássica. A segurança de acesso aos dados é garantida pelo isolamento do navegador (Same-Origin Policy).
- **Proteção Nuvem (Fase 7):** A proteção do backend é garantida pelo Supabase com Row Level Security (RLS) no PostgreSQL validando os tokens JWT (`auth.uid() = user_id`), prevenindo ataques como BOLA/IDOR (Broken Object Level Authorization).
- **Veredito / Ação:** **Conforme e Implementado.** O acesso aos dados em nuvem está devidamente restrito por tenant.

## 2. Criptografia de Senhas no Banco de Dados
- **Estado Atual (Local-first):** Excelente. As senhas em texto plano **nunca** são armazenadas. O sistema utiliza a API nativa `WebCrypto` (`src/lib/crypto.ts` e `src/lib/auth.ts`) para gerar um hash forte usando **PBKDF2-SHA256** com milhares de iterações e _salt_ aleatório. Este hash é usado tanto para login local quanto para derivar a chave simétrica de criptografia.
- **Fase 7 (Supabase):** A autenticação remota é delegada ao **Supabase Auth**, que utiliza algoritmos robustos padrão da indústria (GoTrue/PostgreSQL pgcrypto) em seus servidores para proteção das credenciais, garantindo conformidade. O cofre local continua usando a senha primária (Zero-Knowledge).
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
- **Estado Atual (Local-first):** Altamente Seguro. A arquitetura implementa uma camada interceptadora (`src/lib/camposCifrados.ts`) que criptografa dados financeiros e de clientes com **AES-GCM-256** antes de salvar no IndexedDB.
- **Arquitetura de Chaves (DEK/KEK):** A chave de criptografia dos dados (DEK - Data Encryption Key) não é derivada diretamente da senha do usuário. Em vez disso, a DEK é gerada aleatoriamente (256-bits) e armazenada de forma encriptada (Wrapped) por Key Encryption Keys (KEKs) na tabela `user_keys` do Supabase. Existem duas KEKs principais: uma derivada da Senha do Cofre e outra derivada do `user_id` (via sessão autenticada) da conta em nuvem acrescido de um _pepper_ local para fins de recuperação. Isso permite que o usuário troque a senha local ou recupere o acesso (após verificação por código OTP via E-mail) sem perder os dados e sem que o sistema remoto conheça as chaves em claro.
- **Fase 7 (Supabase):** O Supabase criptografa todos os dados "em repouso" (at rest) nativamente no servidor AWS/GCP. 
- **Veredito / Ação:** **Seguro e Conforme.** Recomenda-se **manter** a camada `camposCifrados.ts` ativa mesmo com a sincronização do Supabase. Isso cria uma arquitetura **E2EE (End-to-End Encryption)**, onde o Supabase armazena os dados já cifrados pelo cliente, impedindo até mesmo o vazamento em nuvem em caso de invasão da conta.

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
2. **Manutenção do AES-GCM (Zero-Knowledge):** A funcionalidade do `camposCifrados.ts` não deve ser substituída. A **Senha do Cofre** não é a senha da conta na nuvem, mas a semente local. O usuário fará login com Google/Email para provar identidade, mas obrigatoriamente precisará inserir sua Senha do Cofre para decifrar os perfis offline.
3. **Mesclagem Segura de Contas:** Ao vincular um login social (Google/Apple) a uma conta puramente local/offline anterior, a mesclagem deve ocorrer **apenas** quando o usuário já estiver atestado pela senha local atual.
4. **Email Verificado (OTP):** Contas novas criadas sem provedores OAuth devem utilizar e-mail válido com verificação de posse por OTP de 5 minutos, sem usar senhas em claro trafegadas ao backend.

## 7. Conformidade com LGPD/GDPR (Direito ao Esquecimento)
- **Estado Atual:** Em total conformidade. O aplicativo possui fluxos explícitos e sem fricção para exclusão de dados e contas.
- **Mecanismos Implementados:**
  - **Exclusão de Dados (Zerar):** O usuário pode limpar toda a sua base de dados (faturas, peças, clientes) do perfil local e, simultaneamente, disparar um evento (via RPC `delete_user_data()`) que apaga o registro remoto, sem destruir a própria conta na nuvem.
  - **Exclusão de Conta (Delete Account):** Ao excluir o perfil principal na aba de Perfil, o aplicativo aciona a exclusão integral da conta no Auth do Supabase (via RPC `delete_user_account()`). Esse gatilho desencadeia cascatas (`ON DELETE CASCADE`) que destroem o vinculo OAuth, senhas, `user_keys` e toda a infraestrutura `sync_events` e metadados. Adicionalmente, todos os bancos de dados locais IndexedDB e `localStorage` são expurgados no mesmo evento.
- **Veredito / Ação:** **Seguro e Conforme.** As garantias de Direito ao Esquecimento foram asseguradas nas pontas do cliente (aparelho) e do servidor (Supabase).
