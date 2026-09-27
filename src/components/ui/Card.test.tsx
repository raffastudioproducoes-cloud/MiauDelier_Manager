import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renderiza children dentro de um contêiner com efeito de vidro', () => {
    render(<Card>Conteúdo</Card>)
    const conteudo = screen.getByText('Conteúdo')
    expect(conteudo).toHaveClass('glass-card')
  })

  it('aplica classes de layout e tipo para variante kpi', () => {
    render(
      <Card
        variant="kpi"
        label="Saldo total"
        value="R$ 1.234,00"
        icon={<span>💰</span>}
      />,
    )

    expect(screen.getByText('Saldo total')).toHaveClass('text-label-sm', 'text-on-surface-variant')
    expect(screen.getByText('R$ 1.234,00')).toHaveClass('text-headline-sm', 'font-semibold', 'text-primary')
    expect(screen.getByText('💰')).toBeInTheDocument()
    const container = screen.getByRole('generic', { name: /saldo total/i })
    expect(container).toHaveClass('kpi-card', 'glass-card', 'rounded-xl', 'text-on-surface', 'p-4')
  })

  it('oculta label quando omitido na variante kpi', () => {
    render(<Card variant="kpi" value="42" />)
    expect(screen.queryByText('42')).toBeInTheDocument()
    expect(screen.queryByText('Saldo total')).not.toBeInTheDocument()
  })

  it('oculta trend quando omitido na variante kpi', () => {
    render(
      <Card
        variant="kpi"
        label="Lucro do mês"
        value="R$ 100,00"
        icon={<span>📈</span>}
      />,
    )
    expect(screen.getByText('Lucro do mês')).toBeInTheDocument()
    expect(screen.getByText('📈')).toBeInTheDocument()
    expect(screen.queryByText('tendência')).not.toBeInTheDocument()
  })

  it('renderiza trend quando fornecido na variante kpi', () => {
    render(
      <Card
        variant="kpi"
        label="Pedidos"
        value="5"
        trend={<span className="text-xs text-success">+2</span>}
      />,
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('+2')).toHaveClass('text-success')
  })
})
