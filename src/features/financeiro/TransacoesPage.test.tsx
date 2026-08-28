import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta } from './contasRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { TransacoesPage } from './TransacoesPage'

describe('TransacoesPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
    await criarConta({ nome: 'Caixa', saldoInicial: 100 })
  })

  it('registra uma transação de entrada vinculada à conta', async () => {
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^conta$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^tipo$/i), { target: { value: 'entrada' } })
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '150' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Venda de chaveiro' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar transação/i }))

    await waitFor(() => expect(screen.getByText('Venda de chaveiro')).toBeInTheDocument())
  })

  it('desabilita o registro quando não há conta cadastrada', async () => {
    await db.contas.clear()
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    expect(await screen.findByText(/cadastre pelo menos uma conta/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrar transação/i })).toBeDisabled()
  })
})
