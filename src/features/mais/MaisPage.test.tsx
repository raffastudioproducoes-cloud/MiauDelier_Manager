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
  it('renderiza a página com o título e aviso de menu unificado', () => {
    render(<MaisPage />)
    expect(screen.getByText('Mais')).toBeInTheDocument()
    expect(screen.getByText(/Atalhos Unificados no Menu Principal/i)).toBeInTheDocument()
  })

  it('renderiza botão/link para ir ao início', () => {
    render(<MaisPage />)
    const link = screen.getByRole('link', { name: /ir para o início/i })
    expect(link.getAttribute('href')).toBe('/')
  })
})

