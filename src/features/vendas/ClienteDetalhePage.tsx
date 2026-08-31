import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { listarClientes, type ClienteDecifrado } from './clientesRepo'
import { listarPedidos, type PedidoComCliente } from './pedidosRepo'

const routeApi = getRouteApi('/clientes/$clienteId')

export function ClienteDetalhePage() {
  const { clienteId } = routeApi.useParams()
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [cliente, setCliente] = useState<ClienteDecifrado | undefined>(undefined)
  const [pedidos, setPedidos] = useState<PedidoComCliente[]>([])
  const [carregado, setCarregado] = useState(false)

  const id = Number(clienteId)

  async function recarregar() {
    const [clientes, todosPedidos] = await Promise.all([listarClientes(), listarPedidos()])
    if (!montado.current) return
    setCliente(clientes.find((c) => c.id === id))
    setPedidos(todosPedidos.filter((pedido) => pedido.clienteId === id))
    setCarregado(true)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar cliente.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [clienteId])

  if (!carregado) return null

  if (!cliente) {
    return <EmptyState titulo="Cliente não encontrado" descricao="Ele pode ter sido excluído." />
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-sm font-semibold text-primary">
            {cliente.nome
              .split(' ')
              .slice(0, 2)
              .map((parte) => parte.charAt(0))
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-on-surface">{cliente.nome}</h1>
            {cliente.contato && <p className="mt-1 text-label-sm text-on-surface-variant">{cliente.contato}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-on-surface">Pedidos</h2>
        {pedidos.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhum pedido registrado para este cliente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pedidos.map((pedido) => (
              <li key={pedido.id} className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Pedido #{pedido.id} — {new Date(pedido.criadoEm).toLocaleString('pt-BR')}
                </span>
                <Badge variant="neutral">{pedido.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
