import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarCliente } from './clientesRepo'
import { criarPedido } from './pedidosRepo'
import { criarForma } from '../producao/formasRepo'
import { criarPeca, atualizarPrecoVendaPeca } from '../producao/pecasRepo'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

// Mock do módulo de pedidos
const mockAtualizarProgressoPedido = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('./pedidosRepo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pedidosRepo')>()
  return {
    ...actual,
    atualizarProgressoPedido: mockAtualizarProgressoPedido,
  }
})

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ pedidoId: '1' }),
  }),
}))

const { PedidoDetalhePage } = await import('./PedidoDetalhePage')

describe('PedidoDetalhePage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
    mockAtualizarProgressoPedido.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra cliente, peças com preço e o valor total', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [] })
    await atualizarPrecoVendaPeca(pecaId, 42)
    await criarPedido({ clienteId, pecaIds: [pecaId] })

    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())
    expect(screen.getByText(/chaveiro gato/i)).toBeInTheDocument()
    expect(screen.getByText(/total: r\$ 42\.00/i)).toBeInTheDocument()
  })

  it('permite alterar o status do pedido', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    await criarPedido({ clienteId, pecaIds: [] })

    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'entregue' } })

    await waitFor(() => expect(screen.getAllByText(/entregue/i).length).toBeGreaterThan(0))
  })

  it('salva prazo, etapa e progresso da agenda do pedido', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    await criarPedido({ clienteId, pecaIds: [] })


    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/prazo de entrega/i), { target: { value: '2026-12-01' } })
    fireEvent.blur(screen.getByLabelText(/prazo de entrega/i))

    await waitFor(() => expect(screen.getByDisplayValue('2026-12-01')).toBeInTheDocument())
  })

  it('mostra estado vazio quando o pedido não existe', async () => {
    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/pedido não encontrado/i)).toBeInTheDocument())
  })

  it('debounce: cada iteração agenda um save após o debounce, não descarta anteriores', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva' })
    const pedidoId = await criarPedido({ clienteId, pecaIds: [] })

    render(<ToastProvider><PedidoDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/joana silva/i)).toBeInTheDocument())

    const slider = screen.getByRole('slider', { name: /progresso/i })
    expect(slider).toBeInTheDocument()

    // Simula 5 pressionamentos rápidos de seta
    for (let i = 1; i <= 5; i++) {
      fireEvent.change(slider, { target: { value: String(i * 10) } })
    }

    // No momento imediato, nada foi persistido ainda
    expect(mockAtualizarProgressoPedido).not.toHaveBeenCalled()

    // Avança tempo real até todos os debounces decorrerem (cada um agenda seu próprio save)
    await waitFor(
      () => expect(mockAtualizarProgressoPedido).toHaveBeenCalledTimes(5),
      { timeout: 2000 }
    )

    // Cada iteração gerou um save, com o valor correspondente ao momento do ajuste
    expect(mockAtualizarProgressoPedido).toHaveBeenNthCalledWith(1, pedidoId, { progresso: 10 })
    expect(mockAtualizarProgressoPedido).toHaveBeenNthCalledWith(2, pedidoId, { progresso: 20 })
    expect(mockAtualizarProgressoPedido).toHaveBeenNthCalledWith(3, pedidoId, { progresso: 30 })
    expect(mockAtualizarProgressoPedido).toHaveBeenNthCalledWith(4, pedidoId, { progresso: 40 })
    expect(mockAtualizarProgressoPedido).toHaveBeenNthCalledWith(5, pedidoId, { progresso: 50 })
  })
})
