import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Breadcrumb usa <Link> do TanStack Router (navegação SPA, sem reload que zeraria a sessão).
// O Link exige um router em contexto; aqui ele vira uma <a> simples.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...resto }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
}))

const { Breadcrumb } = await import('./Breadcrumb')

const itens = [
  { rotulo: 'Início', href: '/' },
  { rotulo: 'Peças', href: '/pecas' },
  { rotulo: 'Detalhe' },
]

describe('Breadcrumb', () => {
  it('renderiza todos os rótulos separados por /', () => {
    const { container } = render(<Breadcrumb itens={itens} />)
    expect(screen.getByText('Início')).toBeInTheDocument()
    expect(screen.getByText('Peças')).toBeInTheDocument()
    expect(screen.getByText('Detalhe')).toBeInTheDocument()
    expect(container.textContent).toContain('/')
  })

  it('último item não é um link, os anteriores são', () => {
    render(<Breadcrumb itens={itens} />)
    expect(screen.getAllByRole('link').map((el) => el.textContent)).toEqual(['Início', 'Peças'])
    expect(screen.getByText('Detalhe').tagName).not.toBe('A')
  })
})
