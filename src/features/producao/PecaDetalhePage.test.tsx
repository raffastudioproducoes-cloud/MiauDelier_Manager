import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarPeca } from './pecasRepo'
import { criarConta } from '../financeiro/contasRepo'
import { listarTransacoesDaConta } from '../financeiro/transacoesRepo'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

let pecaIdAtual = '1'

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ pecaId: pecaIdAtual }),
  }),
}))

const { PecaDetalhePage } = await import('./PecaDetalhePage')

describe('PecaDetalhePage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('mostra estado vazio quando a peça não existe', async () => {
    pecaIdAtual = '999'
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/peça não encontrada/i)).toBeInTheDocument())
  })

  it('vender peça pede valor e cria transação', async () => {
    await setupAccount('senha-teste')
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [] })
    pecaIdAtual = String(pecaId)

    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText('Chaveiro gato')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'vendida' } })

    await waitFor(() => expect(screen.getByText('Confirmar venda')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Valor da venda'), { target: { value: '50' } })
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => expect(screen.getByText(/venda registrada com sucesso/i)).toBeInTheDocument())

    const transacoes = await listarTransacoesDaConta(contaId)
    expect(transacoes).toHaveLength(1)
    expect(transacoes[0].valor).toBe(50)
    expect(transacoes[0].tipo).toBe('entrada')
  })
})
