# Sistema de Design (DESIGN.md)

Este documento define os princípios visuais, a paleta de cores, a tipografia e os padrões de componentes de interface do **MiauDelier Manager**.

---

## 1. Princípios de Design

1. **Focado no Artesão de Resina**: Interface escura e limpa (Dark Mode), otimizada para uso em ambientes de ateliê (evitando fadiga visual com pó/resina e iluminação forte).
2. **Glassmorphism & Elegância**: Uso sutil de superfícies semitransparentes com desfoque de fundo (`backdrop-blur`), bordas suaves e gradientes em tons de roxo/violeta, transmitindo um toque artesanal refinado.
3. **Clareza Numérica & Técnica**: Destaque visual para volumes (ml), massas (g/kg), valores monetários (R$) e códigos de série (`#0001`), facilitando a leitura rápida no ateliê.
4. **Design Responsivo (Mobile-First a Desktop)**: Navegação fluida tanto em celulares (na bancada de trabalho) quanto em computadores de mesa.

---

## 2. Paleta de Cores

O sistema utiliza a paleta semântica baseada nas cores padrão do Tailwind CSS com extensão HSL Dark Mode:

### Cores Principais e de Fundo
- **Fundo Principal (Canvas)**: `bg-slate-950` (`#020617`)
- **Superfície dos Cards (Glassmorphism)**: `bg-slate-900/90` (`#0f172a` com opacidade)
- **Superfícies de Destaque / Painéis**: `bg-slate-900/40` a `bg-slate-900/80`
- **Bordas dos Cards / Divisores**: `border-slate-800` (`#1e293b`) ou `border-outline-variant/30`

### Cores Semânticas de Ação e Status
- **Primária / Destaque (Violeta/Roxo MiauDelier)**: `bg-violet-600` (`#7c3aed`) / `hover:bg-violet-500` (`#8b5cf6`)
- **Sucesso / Pronta Entrega / Venda (Verde Esmeralda)**: `bg-emerald-600` (`#059669`) / `text-emerald-400`
- **Aviso / Em Cura (Âmbar)**: `bg-warning/20` / `border-warning` / `text-amber-400` (`#f59e0b`)
- **Erro / Cancelado / Perigo (Carmim/Rosa)**: `bg-error/10` / `text-error` (`#f43f5e`)

---

## 3. Tipografia

- **Família Principal**: `Manrope`, system-ui, sans-serif.
- **Família Monoespaçada**: `JetBrains Mono`, `ui-monospace`, `font-mono` (utilizada em valores de moedas, medidas em ml/g, horas de cura e números de série `#0001`).

### Hierarquia Tipográfica
- **Título da Página (H1)**: `text-xl font-semibold text-on-surface`
- **Título de Seção / Card (H2/H3)**: `text-base font-semibold text-on-surface` ou `text-lg font-bold`
- **Texto do Corpo**: `text-sm text-on-surface`
- **Rótulos e Legendas**: `text-xs text-on-surface-variant` ou `text-label-sm`
- **Textos Secundários / Notas**: `text-[11px] text-slate-400`

---

## 4. Componentes de UI Padronizados

Todos os componentes visuais residem em `src/components/ui/`:

### 4.1. `<Button>`
- **Descrição**: Botão padrão da aplicação com estados hover, foco e desabilitado.
- **Props principais**: `variante` (`'primary'` | `'ghost'`), `disabled`, `type`, `className`.
- **Uso**:
  ```tsx
  <Button variante="primary" type="submit">Salvar</Button>
  <Button variante="ghost" onClick={handleCancel}>Cancelar</Button>
  ```

### 4.2. `<Card>`
- **Descrição**: Container em estilo glassmorphic para agrupar formulários, relatórios e cards de listagem.
- **Estilo**: Fundo escuro com leve opacidade, borda suave e sombra sutil.

### 4.3. `<Badge>`
- **Descrição**: Etiqueta indicadora de status (`success`, `warning`, `danger`, `neutral`).
- **Uso**: Exibe o status da peça (`PRONTA`, `CURANDO`, `VENDIDA`, `CANCELADA`) ou de moldes.

### 4.4. `<TextField>`
- **Descrição**: Campo de entrada de texto ou número com rótulo obrigatório (`rotulo`) e exibição de mensagem de erro (`erro`).

### 4.5. `<SeletorImagem>`
- **Descrição**: Componente para captura de fotos de moldes e peças.
- **Recursos**:
  - Solicitação de permissão de câmera ao vivo via `getUserMedia`.
  - Fallback automático para seleção de fotos da galeria (`input file`).
  - Redimensionamento e compressão automática em Canvas para JPEG base64.

### 4.6. `<ConfirmModal>`
- **Descrição**: Modal de confirmação para ações destrutivas (exclusão de peças, moldes, materiais) ou transações críticas.

### 4.7. `<EmptyState>`
- **Descrição**: Componente para exibição quando uma lista de dados está vazia, contendo título descritivo e instrução.
