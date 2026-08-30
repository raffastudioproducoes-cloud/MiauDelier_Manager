import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarCliente } from './clientesRepo'
import { criarPedido } from './pedidosRepo'
import { criarForma } from '../producao/formasRepo'
import { criarPeca } from '../producao/pecasRepo'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

let clienteIdAtual = '1'

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ clienteId: clienteIdAtual }),
  }),
}))

const { ClienteDetalhePage } = await import('./ClienteDetalhePage')

describe('ClienteDetalhePage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra nome, contato e os pedidos do cliente', async () => {
    const clienteId = await criarCliente({ nome: 'Joana Silva', contato: '21999990000' })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [] })
    await criarPedido({ clienteId, pecaIds: [pecaId] })
    clienteIdAtual = String(clienteId)

    render(<ToastProvider><ClienteDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText('Joana Silva')).toBeInTheDocument())
    expect(screen.getByText('21999990000')).toBeInTheDocument()
    expect(screen.getByText(/pedido #/i)).toBeInTheDocument()
  })

  it('mostra estado vazio quando o cliente não existe', async () => {
    clienteIdAtual = '999'
    render(<ToastProvider><ClienteDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/cliente não encontrado/i)).toBeInTheDocument())
  })

  it('mostra mensagem quando o cliente não tem pedidos', async () => {
    const clienteId = await criarCliente({ nome: 'Cliente sem pedidos' })
    clienteIdAtual = String(clienteId)

    render(<ToastProvider><ClienteDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText('Cliente sem pedidos')).toBeInTheDocument())
    expect(screen.getByText(/nenhum pedido registrado/i)).toBeInTheDocument()
  })
})
