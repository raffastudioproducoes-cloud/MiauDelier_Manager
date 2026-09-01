import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import {
  criarPedido,
  listarPedidos,
  atualizarStatusPedido,
  listarPecaIdsJaVinculadas,
  excluirPedido,
} from './pedidosRepo'
import { listarAuditoria } from '../auditoria/auditoriaRepo'

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

  it('lista peças já vinculadas a algum pedido', async () => {
    await criarPedido({ clienteId: 1, pecaIds: [1] })
    const vinculadas = await listarPecaIdsJaVinculadas()
    expect(vinculadas).toContain(1)
    expect(vinculadas).not.toContain(2)
  })

  it('calcula valorTotal do pedido a partir do precoVenda das peças', async () => {
    await db.formas.add({ nome: 'Vaso', geometria: 'direto', dimensoesCm: {} })
    await db.pecas.add({ nome: 'Peça A', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 50 })
    await db.pecas.add({ nome: 'Peça B', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 30 })

    await criarPedido({ clienteId: 1, pecaIds: [1, 2] })

    const pedidos = await listarPedidos()
    expect(pedidos[0].valorTotal).toBe(80)
  })

  it('exclui um pedido', async () => {
    const id = await criarPedido({ clienteId: 1, pecaIds: [1] })
    await excluirPedido(id)

    const pedidos = await listarPedidos()
    expect(pedidos).toHaveLength(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'pedido' && r.entidadeId === id)
    expect(registro).toBeDefined()
  })
})
