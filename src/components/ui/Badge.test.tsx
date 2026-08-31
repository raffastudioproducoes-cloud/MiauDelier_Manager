import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renderiza o texto passado', () => {
    render(<Badge>Ativo</Badge>)
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('aplica classe de cor conforme variant', () => {
    render(<Badge variant="danger">Erro</Badge>)
    expect(screen.getByText('Erro')).toHaveClass('text-[var(--color-danger)]')
  })

  it('usa variant neutral por padrão', () => {
    render(<Badge>Padrão</Badge>)
    expect(screen.getByText('Padrão')).toHaveClass('text-on-surface-variant')
  })
})
