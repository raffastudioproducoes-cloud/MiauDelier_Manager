import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaisPage } from './MaisPage'

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('MaisPage', () => {
  it('renderiza a página com o título', () => {
    render(<MaisPage />)
    expect(screen.getByText('Mais')).toBeInTheDocument()
    expect(screen.getByText(/Hub central com atalhos/)).toBeInTheDocument()
  })

  it('renderiza todas as seções', () => {
    render(<MaisPage />)
    expect(screen.getByText('Produção')).toBeInTheDocument()
    expect(screen.getByText('Vendas')).toBeInTheDocument()
    expect(screen.getByText('Financeiro')).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()
  })

  it('renderiza links-chave com href correto', () => {
    render(<MaisPage />)

    const rotasEsperadas = [
      '/materiais',
      '/pedidos',
      '/analytics',
      '/agenda',
      '/assistente',
    ]

    rotasEsperadas.forEach((rota) => {
      const links = screen.getAllByRole('link')
      const encontrado = links.some((link) => link.getAttribute('href') === rota)
      expect(encontrado).toBe(true)
    })
  })
})
