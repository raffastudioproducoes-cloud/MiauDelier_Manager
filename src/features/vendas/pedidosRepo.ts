import { db, type Pedido, type StatusPedido } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

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
        return soma + Math.round((peca?.precoVenda ?? 0) * 100)
      }, 0) / 100
      return { ...pedido, nomeCliente: cliente?.nome ?? '—', valorTotal: pedido.valorVenda ?? valorTotal }
    }),
  )
}

export async function editarPecasPedido(pedidoId: number, pecaIds: number[]): Promise<void> {
  if (!pecaIds.length || pecaIds.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(pecaIds).size !== pecaIds.length) throw new Error('Selecione ao menos uma peça válida.')
  await db.transaction('rw', db.pedidos, db.pecas, async () => {
    const pedido = await db.pedidos.get(pedidoId)
    if (!pedido) throw new Error('Pedido não encontrado.')
    if (pedido.vendaRegistradaEm) throw new Error('Não é possível alterar as peças após concluir a venda.')
    if (pedido.status === 'cancelado') throw new Error('Não é possível editar um pedido cancelado.')
    const outros = (await db.pedidos.toArray()).filter(p => p.id !== pedidoId)
    for (const id of pecaIds) {
      const peca = await db.pecas.get(id)
      if (!peca) throw new Error('Uma das peças não foi encontrada.')
      if (!pedido.pecaIds.includes(id) && (peca.status === 'vendida' || peca.status === 'cancelada')) throw new Error('A peça selecionada não está disponível.')
      if (outros.some(p => p.pecaIds.includes(id))) throw new Error('Uma das peças já está vinculada a outro pedido.')
    }
    await db.pedidos.update(pedidoId, { pecaIds })
  })
}

export async function concluirVendaPedido(pedidoId: number, contaId: number, valorEsperado: number): Promise<void> {
  await db.transaction('rw', [db.pedidos, db.pecas, db.contas, db.transacoes, db.eventosPeca, db.auditoria], async () => {
    const pedido = await db.pedidos.get(pedidoId)
    if (!pedido) throw new Error('Pedido não encontrado.')
    if (pedido.vendaRegistradaEm || pedido.transacaoVendaId) throw new Error('A venda deste pedido já foi registrada.')
    if (pedido.status === 'cancelado') throw new Error('Não é possível vender um pedido cancelado.')
    if (!await db.contas.get(contaId)) throw new Error('Selecione uma carteira válida.')
    if (!pedido.pecaIds.length || new Set(pedido.pecaIds).size !== pedido.pecaIds.length) throw new Error('O pedido precisa conter peças válidas.')
    const pecas = await Promise.all(pedido.pecaIds.map(id => db.pecas.get(id)))
    if (pecas.some(p => !p || p.status === 'vendida' || p.status === 'cancelada' || !Number.isFinite(p.precoVenda) || (p.precoVenda ?? 0) <= 0)) throw new Error('Confira as peças: todas devem estar disponíveis e ter preço maior que zero.')
    const centavos = pecas.reduce((soma, p) => soma + Math.round(p!.precoVenda! * 100), 0)
    if (!Number.isSafeInteger(centavos) || centavos <= 0) throw new Error('O valor do pedido é inválido.')
    const valor = centavos / 100
    if (!Number.isFinite(valorEsperado) || Math.round(valorEsperado * 100) !== centavos) throw new Error('O valor do pedido mudou. Atualize a página e confira antes de concluir a venda.')
    const data = new Date().toISOString()
    const transacaoVendaId = await db.transacoes.add({ contaId, tipo: 'entrada', valorCriptografado: valor.toString(), descricao: `Venda do pedido #${pedidoId}`, data })
    for (const peca of pecas) {
      await db.pecas.update(peca!.id!, { status: 'vendida' })
      await db.eventosPeca.add({ pecaId: peca!.id!, tipo: 'mudanca_status', descricao: `Venda registrada no pedido #${pedidoId}`, criadoEm: data })
    }
    await db.pedidos.update(pedidoId, { vendaRegistradaEm: data, transacaoVendaId, valorVenda: valor })
    await registrarAuditoria('pedido', pedidoId, 'venda', undefined, valor.toString())
  })
}

export async function atualizarStatusPedido(pedidoId: number, status: StatusPedido): Promise<void> {
  await db.transaction('rw', db.pedidos, async () => {
    const pedido = await db.pedidos.get(pedidoId)
    if (!pedido) throw new Error('Pedido não encontrado.')
    if (pedido.vendaRegistradaEm && status === 'cancelado') throw new Error('Este pedido possui uma venda registrada. O cancelamento exige tratar a venda primeiro.')
    await db.pedidos.update(pedidoId, { status })
  })
}

export async function atualizarProgressoPedido(
  pedidoId: number,
  dados: { prazoEntrega?: string; etapa?: string; progresso?: number },
): Promise<void> {
  await db.pedidos.update(pedidoId, dados)
}

export async function listarPecaIdsJaVinculadas(): Promise<number[]> {
  const pedidos = await db.pedidos.toArray()
  return pedidos.flatMap((pedido) => pedido.pecaIds)
}

export async function excluirPedido(pedidoId: number): Promise<void> {
  await db.transaction('rw', db.pedidos, db.auditoria, async () => {
    const pedido = await db.pedidos.get(pedidoId)
    if (pedido?.vendaRegistradaEm) throw new Error('Não é possível excluir um pedido com venda registrada.')
    await db.pedidos.delete(pedidoId)
    await registrarAuditoria('pedido', pedidoId, 'exclusao')
  })
}
