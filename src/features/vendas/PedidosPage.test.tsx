import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarCliente } from './clientesRepo'
import { criarForma } from '../producao/formasRepo'
import { criarMaterial } from '../producao/materiaisRepo'
import { criarPeca } from '../producao/pecasRepo'
import { atualizarPrecoVendaPeca } from '../producao/pecasRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => (
    <a href={to.replace('$pedidoId', params?.pedidoId ?? '')} {...props}>{children}</a>
  ),
}))

const { PedidosPage } = await import('./PedidosPage')

describe('PedidosPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
    await criarCliente({ nome: 'Joana Silva' })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
    await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [{ materialId, quantidade: 20 }] })
  })

  it('cria um pedido vinculando cliente e peça', async () => {
    render(<ToastProvider><PedidosPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^cliente$/i), { target: { value: '1' } })
    fireEvent.click(screen.getByLabelText(/chaveiro gato/i))
    fireEvent.click(screen.getByRole('button', { name: /criar pedido/i }))

    await waitFor(() => expect(screen.getByText('Joana Silva')).toBeInTheDocument())
    expect(screen.getByText(/aberto/i)).toBeInTheDocument()
  })

  it('desabilita a criação quando não há cliente ou peça cadastrado', async () => {
    await db.clientes.clear()
    render(<ToastProvider><PedidosPage /></ToastProvider>)

    expect(await screen.findByText(/cadastre pelo menos um cliente/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar pedido/i })).toBeDisabled()
  })

  it('não mostra peça já vinculada a outro pedido no checklist e exibe o valor total', async () => {
    await atualizarPrecoVendaPeca(1, 50)
    render(<ToastProvider><PedidosPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^cliente$/i), { target: { value: '1' } })
    fireEvent.click(screen.getByLabelText(/chaveiro gato/i))
    fireEvent.click(screen.getByRole('button', { name: /criar pedido/i }))

    await waitFor(() => expect(screen.getByText(/R\$ 50\.00/)).toBeInTheDocument())
    expect(screen.queryByLabelText(/chaveiro gato/i)).not.toBeInTheDocument()
  })
})
