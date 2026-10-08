# Regras de Desenvolvimento (RULES)

Este documento estabelece as diretrizes obrigatórias de desenvolvimento, padrões de codificação, regras de arquitetura e convenções de colaboração para o **MiauDelier Manager**.

---

## 1. Princípios Gerais

1. **Consultar a Documentação Primeiro**: Antes de realizar qualquer alteração estrutural no código, consulte `PRD.md`, `ARCHITECTURE.md` e este documento `RULES.md`.
2. **Manutenibilidade e Código Limpo**: Escreva código autoexplicativo, com funções pequenas e responsabilidades bem definidas.
3. **Evitar Duplicação (DRY)**: Reutilize utilitários (`src/lib/`), hooks, repositórios e componentes visuais (`src/components/ui/`).
4. **Mudanças Pequenas e Focadas**: Faça edições estritamente necessárias para a tarefa atual. Nunca modifique arquivos alheios ao escopo da solicitação.
5. **Nomes Significativos**: Use nomes descritivos em português para termos de negócio (`peca`, `forma`, `material`, `transacao`, `custoFabricacao`, `dimensoesCm`) e em inglês apenas para utilitários técnicos padrão React/JS.

---

## 2. Padrões de Tecnologia e Código

- **Linguagem**: TypeScript em modo `strict`. Não utilize o tipo `any`.
- **Framework React**: React 19 (Functional Components com Hooks).
- **Roteamento**: TanStack Router baseado em arquivos (`src/routes`). Não modifique manualmente `routeTree.gen.ts` (gerado automaticamente pelo TanStack Router CLI/Vite).
- **Estilização**: Tailwind CSS v4 mantendo a paleta de cores escuras em HSL (Dark Mode padrão).
- **Tratamento de Exceções**: Exiba mensagens amigáveis via `useToast()` para falhas de validação/operação, preservando logs detalhados de erro no console em ambiente de dev.

---

## 3. Segurança & Regras de Acesso aos Dados

1. **Sem segredos no frontend**: somente URL e chave publicável Supabase podem entrar no bundle. `service_role`, credenciais OAuth e chaves de IA ficam no ambiente seguro/Edge Function.
2. **Autorização obrigatória**: toda tabela e RPC exposta deve respeitar a sessão Supabase e RLS por usuário/perfil; o IndexedDB é cache e não fonte de autorização.
3. **Dados de negócio sem cifra interna**: não reintroduzir `cifrarCampo`, DEK/KEK ou cofre local. O transporte HTTPS, Auth e RLS são as proteções definidas para este projeto.
3. **Proibição de Exposição de Segredos**: Nunca inclua chaves de API, tokens, senhas ou segredos em arquivos de código, commits ou documentação markdown.
4. **Validação Rigorosa de Backup**: Nenhum backup deve ser importado para o banco de dados sem antes verificar o formato do envelope JSON e validar o checksum SHA-256.

---

## 4. Captura e Manipulação de Imagens

1. **Processamento via Offscreen Canvas**: Ao capturar fotos da câmera ou carregar da memória interna/galeria (`SeletorImagem.tsx`), a imagem deve ser redimensionada para dimensões máximas de 800×800px e comprimida em formato JPEG Base64 (`quality: 0.8`).
2. **Tratamento de Permissão de Câmera**: O componente deve solicitar permissão de câmera via `navigator.mediaDevices.getUserMedia`. Em caso de recusa ou indisponibilidade, deve apresentar feedback claro ao usuário e fazer o fallback para a seleção de arquivos da galeria nativa (`input type="file"`).

---

## 5. Convenções para Componentes e Formulários

1. **Componentes de UI Reutilizáveis**: Utilize exclusivamente os componentes padronizados em `src/components/ui/` (`Button`, `Card`, `Badge`, `TextField`, `ConfirmModal`, `EmptyState`, `Tabs`, `ToastProvider`).
2. **Propriedades Padronizadas**:
   - `Button`: aceita a prop `variante` (opções `'primary'` | `'ghost'`).
   - `TextField`: exige a prop obrigatória `rotulo` e suporta `erro`.
3. **Design System Consistente**: Não crie novos botões com classes arbitrárias inline sem antes verificar se o componente `<Button>` atende à necessidade.

---

## 6. Fluxo de Validação Antes da Conclusão de Tarefas

Antes de declarar qualquer tarefa como concluída ou realizar commits:

1. **Validação de Tipagem TypeScript**:
   ```bash
   npx tsc --noEmit
   ```
   *Nenhum erro de compilação é tolerado.*

2. **Execução dos Testes Automatizados**:
   ```bash
   npx vitest run
   ```
   *Todos os testes da suíte devem ser executados com sucesso (100% de aprovação).*

3. **Verificação do Bundle de Produção** (quando aplicável):
   ```bash
   npx vite build
   ```

---

## 7. Modo Orquestrador do Assistente Antigravity (Memória & Diretrizes)

1. **Atuação Orquestrada**: O assistente Antigravity atua como planejador e coordenador agentivo de elite, combinando o uso inteligente de subagentes, skills e ferramentas específicas com extrema rapidez, precisão e autonomia.
2. **Ciclo de Trabalho**: Planejar -> Executar em paralelo/série com ferramentas/skills apropriadas -> Verificar com tipagem (`tsc`) e testes (`vitest`) -> Reportar síntese clara e objetiva ao usuário.
3. **Preservação de Contexto e Qualidade**: Cada tarefa deve incluir o contexto completo (requisitos, arquivos-alvo, restrições e saída esperada), garantindo zero alucinações e 100% de aprovação na suíte automatizada.
