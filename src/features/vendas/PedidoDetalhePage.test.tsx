import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarCliente } from './clientesRepo'
import { criarPedido } from './pedidosRepo'
import { criarForma } from '../producao/formasRepo'
import { criarPeca, atualizarPrecoVendaPeca } from '../producao/pecasRepo'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

let pedidoIdAtual = '1'

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ pedidoId: pedidoIdAtual }),
  }),
}))

const { PedidoDetalhePage } = await import('./PedidoDetalhePage')

describe('PedidoDetalhePage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra cliente, peças com preço e o valor total', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [] })
    await atualizarPrecoVendaPeca(pecaId, 42)
    const pedidoId = await criarPedido({ clienteId, pecaIds: [pecaId] })
    pedidoIdAtual = String(pedidoId)

    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())
    expect(screen.getByText(/chaveiro gato/i)).toBeInTheDocument()
    expect(screen.getByText(/total: r\$ 42\.00/i)).toBeInTheDocument()
  })

  it('permite alterar o status do pedido', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    const pedidoId = await criarPedido({ clienteId, pecaIds: [] })
    pedidoIdAtual = String(pedidoId)

    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'entregue' } })

    await waitFor(() => expect(screen.getAllByText(/entregue/i).length).toBeGreaterThan(0))
  })

  it('salva prazo, etapa e progresso da agenda do pedido', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    const pedidoId = await criarPedido({ clienteId, pecaIds: [] })
    pedidoIdAtual = String(pedidoId)

    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/prazo de entrega/i), { target: { value: '2026-12-01' } })
    fireEvent.blur(screen.getByLabelText(/prazo de entrega/i))

    await waitFor(() => expect(screen.getByDisplayValue('2026-12-01')).toBeInTheDocument())
  })

  it('mostra estado vazio quando o pedido não existe', async () => {
    pedidoIdAtual = '999'
    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/pedido não encontrado/i)).toBeInTheDocument())
  })
})
