import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta } from '../financeiro/contasRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

const { DashboardPage } = await import('./DashboardPage')

describe('DashboardPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra o saldo total calculado a partir das contas', async () => {
    await criarConta({ nome: 'Caixa', saldoInicial: 300 })
    render(<ToastProvider><DashboardPage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/300/)).toBeInTheDocument())
  })

  it('mostra estado vazio informativo quando não há nenhum dado cadastrado', async () => {
    render(<ToastProvider><DashboardPage /></ToastProvider>)
    await waitFor(() => expect(screen.getAllByText(/0/).length).toBeGreaterThan(0))
  })

  it('renderiza os atalhos de ação rápida pros módulos principais', async () => {
    render(<ToastProvider><DashboardPage /></ToastProvider>)
    expect(await screen.findByRole('button', { name: /nova peça/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo pedido/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo material/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nova transação/i })).toBeInTheDocument()
  })
})
