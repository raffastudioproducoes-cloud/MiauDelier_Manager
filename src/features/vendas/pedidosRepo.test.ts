import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarPedido, listarPedidos, atualizarStatusPedido } from './pedidosRepo'

describe('repositório de pedidos', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await db.clientes.add({ nome: 'Joana Silva' })
  })

  it('cria e lista um pedido com o nome do cliente', async () => {
    await criarPedido({ clienteId: 1, pecaIds: [1, 2] })

    const pedidos = await listarPedidos()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].nomeCliente).toBe('Joana Silva')
    expect(pedidos[0].status).toBe('aberto')
    expect(pedidos[0].pecaIds).toEqual([1, 2])
  })

  it('atualiza o status de um pedido', async () => {
    const id = await criarPedido({ clienteId: 1, pecaIds: [1] })
    await atualizarStatusPedido(id, 'entregue')

    const pedidos = await listarPedidos()
    expect(pedidos[0].status).toBe('entregue')
  })
})
