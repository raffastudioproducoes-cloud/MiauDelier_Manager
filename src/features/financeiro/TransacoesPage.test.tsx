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

  it('mostra as movimentações da conta selecionada, não sempre as da primeira', async () => {
    const segundaConta = await criarConta({ nome: 'Banco', saldoInicial: 0 })
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^conta$/i), { target: { value: String(segundaConta) } })
    fireEvent.change(screen.getByLabelText(/^tipo$/i), { target: { value: 'entrada' } })
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Pix recebido' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar transação/i }))

    await waitFor(() => expect(screen.getByText('Pix recebido')).toBeInTheDocument())
    expect(screen.getByText(/movimentações de banco/i)).toBeInTheDocument()
  })

  it('desabilita o registro quando não há conta cadastrada', async () => {
    await db.contas.clear()
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    expect(await screen.findByText(/cadastre pelo menos uma conta/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrar transação/i })).toBeDisabled()
  })

  it('edita uma transação existente', async () => {
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^conta$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '150' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Venda de chaveiro' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar transação/i }))
    await waitFor(() => expect(screen.getByText('Venda de chaveiro')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Venda corrigida' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(screen.getByText('Venda corrigida')).toBeInTheDocument())
  })

  it('exclui uma transação via ConfirmModal', async () => {
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^conta$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '150' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Venda de chaveiro' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar transação/i }))
    await waitFor(() => expect(screen.getByText('Venda de chaveiro')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.getByText(/nenhuma transação registrada/i)).toBeInTheDocument())
  })

  it('filtra transações por período', async () => {
    render(<ToastProvider><TransacoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^conta$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Antiga' } })
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar transação/i }))
    await waitFor(() => expect(screen.getByText('Antiga')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Recente' } })
    fireEvent.change(screen.getByLabelText(/^data$/i), { target: { value: '2026-08-01' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar transação/i }))
    await waitFor(() => expect(screen.getByText('Recente')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^de$/i), { target: { value: '2026-06-01' } })

    expect(screen.getByText('Recente')).toBeInTheDocument()
    expect(screen.queryByText('Antiga')).not.toBeInTheDocument()
  })
})
