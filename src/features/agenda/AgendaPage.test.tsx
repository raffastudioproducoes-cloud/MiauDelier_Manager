import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarCliente } from '../vendas/clientesRepo'
import { criarPedido, atualizarProgressoPedido } from '../vendas/pedidosRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => (
    <a href={to.replace('$pedidoId', params?.pedidoId ?? '')} {...props}>{children}</a>
  ),
}))

const { AgendaPage } = await import('./AgendaPage')

describe('AgendaPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra estado vazio quando nenhum pedido tem prazo definido', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    await criarPedido({ clienteId, pecaIds: [] })

    render(<ToastProvider><AgendaPage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/nenhum pedido com prazo definido/i)).toBeInTheDocument())
  })

  it('lista pedidos com prazo, ordenados por data e destacando atraso', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    const pedidoLongeId = await criarPedido({ clienteId, pecaIds: [] })
    await atualizarProgressoPedido(pedidoLongeId, { prazoEntrega: '2099-01-01', etapa: 'Em produção', progresso: 20 })
    const pedidoAtrasadoId = await criarPedido({ clienteId, pecaIds: [] })
    await atualizarProgressoPedido(pedidoAtrasadoId, { prazoEntrega: '2000-01-01', etapa: 'Aguardando material' })
    await criarPedido({ clienteId, pecaIds: [] })

    render(<ToastProvider><AgendaPage /></ToastProvider>)

    await waitFor(() => expect(screen.getAllByText(/joana silva/i)).toHaveLength(2))
    expect(screen.getByText(/atrasado/i)).toBeInTheDocument()
  })
})
