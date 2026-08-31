import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { listarPedidos, atualizarStatusPedido, type PedidoComCliente } from './pedidosRepo'
import { listarPecas, type PecaComForma } from '../producao/pecasRepo'
import type { StatusPedido } from '../../db/schema'

const routeApi = getRouteApi('/pedidos/$pedidoId')

const OPCOES_STATUS: StatusPedido[] = ['aberto', 'em_producao', 'entregue', 'cancelado']

export function PedidoDetalhePage() {
  const { pedidoId } = routeApi.useParams()
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [pedido, setPedido] = useState<PedidoComCliente | undefined>(undefined)
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [carregado, setCarregado] = useState(false)

  const id = Number(pedidoId)

  async function recarregar() {
    const [pedidos, todasPecas] = await Promise.all([listarPedidos(), listarPecas()])
    if (!montado.current) return
    setPedido(pedidos.find((p) => p.id === id))
    setPecas(todasPecas)
    setCarregado(true)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar pedido.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [pedidoId])

  async function handleMudarStatus(novoStatus: StatusPedido) {
    try {
      await atualizarStatusPedido(id, novoStatus)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao atualizar status.', 'erro')
      return
    }
    if (!montado.current) return
    await recarregar()
  }

  if (!carregado) return null

  if (!pedido) {
    return <EmptyState titulo="Pedido não encontrado" descricao="Ele pode ter sido excluído." />
  }

  const pecasDoPedido = pedido.pecaIds.map((pecaId) => pecas.find((peca) => peca.id === pecaId)).filter((peca): peca is PecaComForma => Boolean(peca))

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-on-surface">Pedido #{pedido.id}</h1>
            <p className="mt-1 text-label-sm text-on-surface-variant">Cliente: {pedido.nomeCliente}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{pedido.status}</Badge>
            <label htmlFor="status-pedido" className="sr-only">Status</label>
            <select
              id="status-pedido"
              value={pedido.status}
              onChange={(e) => handleMudarStatus(e.target.value as StatusPedido)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {OPCOES_STATUS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-on-surface">Peças</h2>
        {pecasDoPedido.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhuma peça vinculada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pecasDoPedido.map((peca) => (
              <li key={peca.id} className="flex items-center justify-between text-sm text-on-surface-variant">
                <span>{peca.nome}</span>
                <span className="font-medium text-on-surface">R$ {(peca.precoVenda ?? 0).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-right font-semibold text-primary">Total: R$ {pedido.valorTotal.toFixed(2)}</p>
      </Card>
    </div>
  )
}
