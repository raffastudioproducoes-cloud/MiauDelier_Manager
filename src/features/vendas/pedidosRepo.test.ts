import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import {
  criarPedido,
  listarPedidos,
  atualizarStatusPedido,
  atualizarProgressoPedido,
  listarPecaIdsJaVinculadas,
  excluirPedido,
  editarPecasPedido,
  concluirVendaPedido,
} from './pedidosRepo'
import { listarAuditoria } from '../auditoria/auditoriaRepo'
import { listarContas } from '../financeiro/contasRepo'
import { obterResumoDashboard } from '../dashboard/dashboardRepo'

describe('repositório de pedidos', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await db.clientes.add({ nome: 'Joana Silva' })
  })

  it('troca as peças preservando o cliente e impede peças de outro pedido', async () => {
    await db.pecas.bulkAdd([
      { nome: 'A', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 10 },
      { nome: 'B', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 20 },
      { nome: 'C', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 30 },
    ])
    const id = await criarPedido({ clienteId: 1, pecaIds: [1] })
    await criarPedido({ clienteId: 1, pecaIds: [3] })
    await editarPecasPedido(id, [2])
    expect(await db.pedidos.get(id)).toMatchObject({ clienteId: 1, pecaIds: [2] })
    expect((await listarPedidos()).find(p => p.id === id)?.valorTotal).toBe(20)
    await expect(editarPecasPedido(id, [3])).rejects.toThrow(/outro pedido/i)
    expect((await db.pedidos.get(id))?.pecaIds).toEqual([2])
  })

  it('registra uma única venda na carteira e alimenta as métricas', async () => {
    await db.contas.add({ nome: 'Carteira', saldoCriptografado: '10' })
    await db.pecas.bulkAdd([
      { nome: 'A', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 100 },
      { nome: 'B', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 50 },
    ])
    const id = await criarPedido({ clienteId: 1, pecaIds: [1, 2] })
    await concluirVendaPedido(id, 1, 150)
    expect((await listarContas())[0].saldo).toBe(160)
    expect((await obterResumoDashboard()).lucroDoMes).toBe(150)
    expect(await db.transacoes.count()).toBe(1)
    expect((await db.pecas.get(1))?.status).toBe('vendida')
    expect((await db.pedidos.get(id))?.valorVenda).toBe(150)
    await expect(concluirVendaPedido(id, 1, 150)).rejects.toThrow(/já foi registrada/i)
    await expect(editarPecasPedido(id, [1])).rejects.toThrow(/após concluir/i)
    expect(await db.transacoes.count()).toBe(1)
  })

  it('não lança a venda se o preço tiver mudado ou a carteira for inválida', async () => {
    await db.contas.add({ nome: 'Carteira', saldoCriptografado: '0' })
    await db.pecas.add({ nome: 'A', formaId: 1, status: 'pronta', criadaEm: new Date().toISOString(), precoVenda: 100 })
    const id = await criarPedido({ clienteId: 1, pecaIds: [1] })
    await expect(concluirVendaPedido(id, 1, 90)).rejects.toThrow(/valor do pedido mudou/i)
    await expect(concluirVendaPedido(id, 99, 100)).rejects.toThrow(/carteira válida/i)
    expect(await db.transacoes.count()).toBe(0)
    expect((await db.pecas.get(1))?.status).toBe('pronta')
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

  it('atualiza prazo, etapa e progresso de um pedido', async () => {
    const pedidoId = await criarPedido({ clienteId: 1, pecaIds: [] })
    await atualizarProgressoPedido(pedidoId, { prazoEntrega: '2026-12-01', etapa: 'Em produção', progresso: 40 })
    const pedidos = await listarPedidos()
    const pedido = pedidos.find((p) => p.id === pedidoId)
    expect(pedido?.prazoEntrega).toBe('2026-12-01')
    expect(pedido?.etapa).toBe('Em produção')
    expect(pedido?.progresso).toBe(40)
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
