import { db, type Pedido, type StatusPedido } from '../../db/schema'

export interface NovoPedido {
  clienteId: number
  pecaIds: number[]
}

export interface PedidoComCliente extends Pedido {
  nomeCliente: string
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
  const pedidos = await db.pedidos.toArray()
  return Promise.all(
    pedidos.map(async (pedido) => {
      const cliente = await db.clientes.get(pedido.clienteId)
      return { ...pedido, nomeCliente: cliente?.nome ?? '—' }
    }),
  )
}

export async function atualizarStatusPedido(pedidoId: number, status: StatusPedido): Promise<void> {
  await db.pedidos.update(pedidoId, { status })
}
