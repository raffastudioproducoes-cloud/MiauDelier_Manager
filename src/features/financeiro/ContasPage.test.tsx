import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { ContasPage } from './ContasPage'

describe('ContasPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra estado vazio quando não há contas', async () => {
    render(<ToastProvider><ContasPage /></ToastProvider>)
    expect(await screen.findByText(/nenhuma conta cadastrada/i)).toBeInTheDocument()
  })

  it('cadastra uma conta e ela aparece na lista com o saldo decifrado', async () => {
    render(<ToastProvider><ContasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da conta/i), { target: { value: 'Caixa do ateliê' } })
    fireEvent.change(screen.getByLabelText(/saldo inicial/i), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }))

    await waitFor(() => expect(screen.getByText('Caixa do ateliê')).toBeInTheDocument())
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('edita o nome de uma conta existente', async () => {
    render(<ToastProvider><ContasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da conta/i), { target: { value: 'Caixa' } })
    fireEvent.change(screen.getByLabelText(/saldo inicial/i), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }))
    await waitFor(() => expect(screen.getByText('Caixa')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/nome da conta/i), { target: { value: 'Caixa Principal' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(screen.getByText('Caixa Principal')).toBeInTheDocument())
  })

  it('exclui uma conta sem transações via ConfirmModal', async () => {
    render(<ToastProvider><ContasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da conta/i), { target: { value: 'Caixa' } })
    fireEvent.change(screen.getByLabelText(/saldo inicial/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }))
    await waitFor(() => expect(screen.getByText('Caixa')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.getByText(/nenhuma conta cadastrada/i)).toBeInTheDocument())
  })
})
