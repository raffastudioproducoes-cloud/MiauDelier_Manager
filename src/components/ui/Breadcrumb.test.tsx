import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from './Breadcrumb'

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
    expect(screen.getByText('Início').tagName).toBe('A')
    expect(screen.getByText('Peças').tagName).toBe('A')
    expect(screen.getByText('Detalhe').tagName).not.toBe('A')
  })
})
