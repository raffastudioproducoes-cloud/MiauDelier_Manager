import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PrecificacaoPage } from './PrecificacaoPage'

describe('PrecificacaoPage', () => {
  it('calcula o preço final ao preencher os campos', async () => {
    render(<PrecificacaoPage />)

    fireEvent.change(screen.getByLabelText(/custo do material/i), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText(/acessórios/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/rateio de custo fixo/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/margem de lucro/i), { target: { value: '40' } })

    await waitFor(() => expect(screen.getByText(/96,60|96\.60/)).toBeInTheDocument())
  })

  it('não quebra a tela com entrada inválida (percentual fora de faixa)', async () => {
    render(<PrecificacaoPage />)

    fireEvent.change(screen.getByLabelText(/margem de lucro/i), { target: { value: '99999' } })

    expect(await screen.findByText(/preço final: —/i)).toBeInTheDocument()
  })
})
