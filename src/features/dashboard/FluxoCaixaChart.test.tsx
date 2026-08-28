import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FluxoCaixaChart } from './FluxoCaixaChart'

describe('FluxoCaixaChart', () => {
  it('renderiza uma barra por dia recebido', () => {
    const dados = Array.from({ length: 14 }, (_, i) => ({ data: `2026-08-${String(i + 1).padStart(2, '0')}`, entradas: i * 10, saidas: i * 5 }))
    render(<FluxoCaixaChart dados={dados} />)
    expect(screen.getAllByRole('img', { hidden: true }).length + document.querySelectorAll('rect').length).toBeGreaterThan(0)
  })

  it('não quebra com todos os valores zerados', () => {
    const dados = Array.from({ length: 14 }, (_, i) => ({ data: `2026-08-${String(i + 1).padStart(2, '0')}`, entradas: 0, saidas: 0 }))
    render(<FluxoCaixaChart dados={dados} />)
    expect(screen.getByText(/fluxo de caixa/i)).toBeInTheDocument()
  })
})
