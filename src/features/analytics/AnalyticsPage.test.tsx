import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta } from '../financeiro/contasRepo'
import { criarTransacao } from '../financeiro/transacoesRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { AnalyticsPage } from './AnalyticsPage'

describe('AnalyticsPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra estado vazio quando não há transação no período padrão', async () => {
    render(<ToastProvider><AnalyticsPage /></ToastProvider>)
    await waitFor(() => expect(screen.getByText(/nenhuma transação no período/i)).toBeInTheDocument())
  })

  it('mostra os cards de receita, despesa, resultado e margem quando há transações', async () => {
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    const mesAtual = new Date().toISOString().slice(0, 7)
    await criarTransacao({ contaId, tipo: 'entrada', valor: 100, descricao: 'Venda', data: `${mesAtual}-10` })

    render(<ToastProvider><AnalyticsPage /></ToastProvider>)

    await waitFor(() => expect(screen.getAllByText('R$ 100,00').length).toBeGreaterThan(0))
  })
})
