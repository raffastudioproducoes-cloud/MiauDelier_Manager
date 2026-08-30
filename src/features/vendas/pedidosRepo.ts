import { db, type Pedido, type StatusPedido } from '../../db/schema'

export interface NovoPedido {
  clienteId: number
  pecaIds: number[]
}

export interface PedidoComCliente extends Pedido {
  nomeCliente: string
  valorTotal: number
}

export async function criarPedido(novo: NovoPedido): Promise<number> {
  const id = await db.pedidos.add({
    clienteId: novo.clienteId,
    pecaIds: novo.pecaIds,
    status: 'aberto',
    criadoEm: new Date().toISOString(),
  })
  return id as number
}

export async function listarPedidos(): Promise<PedidoComCliente[]> {
  const [pedidos, pecas] = await Promise.all([db.pedidos.toArray(), db.pecas.toArray()])
  return Promise.all(
    pedidos.map(async (pedido) => {
      const cliente = await db.clientes.get(pedido.clienteId)
      const valorTotal = pedido.pecaIds.reduce((soma, pecaId) => {
        const peca = pecas.find((p) => p.id === pecaId)
        return soma + (peca?.precoVenda ?? 0)
      }, 0)
      return { ...pedido, nomeCliente: cliente?.nome ?? '—', valorTotal }
    }),
  )
}

export async function atualizarStatusPedido(pedidoId: number, status: StatusPedido): Promise<void> {
  await db.pedidos.update(pedidoId, { status })
}

export async function listarPecaIdsJaVinculadas(): Promise<number[]> {
  const pedidos = await db.pedidos.toArray()
  return pedidos.flatMap((pedido) => pedido.pecaIds)
}

export async function excluirPedido(pedidoId: number): Promise<void> {
  await db.pedidos.delete(pedidoId)
}
