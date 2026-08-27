import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renderiza o título sempre', () => {
    render(<EmptyState titulo="Nenhum item" />)
    expect(screen.getByText('Nenhum item')).toBeInTheDocument()
  })

  it('renderiza a descrição só quando fornecida', () => {
    const { rerender } = render(<EmptyState titulo="Nenhum item" />)
    expect(screen.queryByText('Detalhe')).not.toBeInTheDocument()

    rerender(<EmptyState titulo="Nenhum item" descricao="Detalhe" />)
    expect(screen.getByText('Detalhe')).toBeInTheDocument()
  })

  it('renderiza a ação quando fornecida', () => {
    render(<EmptyState titulo="Nenhum item" acao={<button>Criar</button>} />)
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })
})
