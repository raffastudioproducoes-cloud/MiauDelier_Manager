import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Breadcrumb usa <Link> do TanStack Router, que exige um router em contexto. Aqui só interessa
// o className, então o Link vira uma <a> simples.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...resto }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
}))

const { Badge } = await import('./ui/Badge')
const { Breadcrumb } = await import('./ui/Breadcrumb')
const { Checkbox } = await import('./ui/Checkbox')
const { ConfirmModal } = await import('./ui/ConfirmModal')
const { EmptyState } = await import('./ui/EmptyState')
const { Radio } = await import('./ui/Radio')
const { Skeleton } = await import('./ui/Skeleton')
const { Switch } = await import('./ui/Switch')
const { Tabs } = await import('./ui/Tabs')
const { ToastProvider } = await import('./ui/ToastProvider')
const { Tooltip } = await import('./ui/Tooltip')
const { NavItem } = await import('./layout/NavItem')

const CLASSE = 'classe-de-teste'

describe('className customizado chega ao elemento raiz', () => {
  it('Badge', () => {
    render(<Badge className={CLASSE}>Ativo</Badge>)
    expect(screen.getByText('Ativo')).toHaveClass(CLASSE)
  })

  it('Breadcrumb', () => {
    render(<Breadcrumb itens={[{ rotulo: 'Início', href: '/' }]} className={CLASSE} />)
    expect(screen.getByLabelText('breadcrumb')).toHaveClass(CLASSE)
  })

  it('Checkbox', () => {
    const { container } = render(
      <Checkbox id="c" rotulo="Aceito" marcado={false} aoMudar={() => {}} className={CLASSE} />,
    )
    expect(container.firstChild).toHaveClass(CLASSE)
  })

  it('ConfirmModal', () => {
    render(
      <ConfirmModal
        aberto
        titulo="Excluir"
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
        className={CLASSE}
      />,
    )
    expect(screen.getByText('Excluir').closest('[role="dialog"]')).toHaveClass(CLASSE)
  })

  it('EmptyState', () => {
    const { container } = render(<EmptyState titulo="Vazio" className={CLASSE} />)
    expect(container.firstChild).toHaveClass(CLASSE)
  })

  it('NavItem', () => {
    render(<NavItem rotulo="Início" ativo={false} onClick={() => {}} className={CLASSE} />)
    expect(screen.getByRole('button', { name: 'Início' })).toHaveClass(CLASSE)
  })

  it('Radio', () => {
    const { container } = render(
      <Radio id="r" name="g" rotulo="Azul" marcado={false} aoMudar={() => {}} className={CLASSE} />,
    )
    expect(container.firstChild).toHaveClass(CLASSE)
  })

  it('Skeleton', () => {
    const { container } = render(<Skeleton width={10} height={10} className={CLASSE} />)
    expect(container.firstChild).toHaveClass(CLASSE)
  })

  it('Switch', () => {
    const { container } = render(
      <Switch id="s" rotulo="Notificações" marcado={false} aoMudar={() => {}} className={CLASSE} />,
    )
    expect(container.firstChild).toHaveClass(CLASSE)
  })

  it('Tabs', () => {
    const { container } = render(
      <Tabs abas={[{ id: 'a', rotulo: 'A', conteudo: <p>x</p> }]} className={CLASSE} />,
    )
    expect(container.firstChild).toHaveClass(CLASSE)
  })

  it('ToastProvider', () => {
    const { container } = render(
      <ToastProvider className={CLASSE}>
        <p>filho</p>
      </ToastProvider>,
    )
    expect(container.querySelector(`.${CLASSE}`)).not.toBeNull()
  })

  it('Tooltip', async () => {
    render(
      <Tooltip conteudo="Dica útil" className={CLASSE}>
        <button>Gatilho</button>
      </Tooltip>,
    )
    fireEvent.focus(screen.getByText('Gatilho'))
    const elementos = await screen.findAllByText('Dica útil')
    expect(elementos.some((el) => el.classList.contains(CLASSE))).toBe(true)
  })
})
