import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { listarPedidos, type PedidoComCliente } from '../vendas/pedidosRepo'

// ponytail: strings "YYYY-MM-DD" (vindas de <input type="date">) já são a data-calendário
// pretendida — não passam por new Date() pra não sofrer conversão de fuso (UTC-midnight vs local)
function hojeLocal(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function AgendaPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [pedidos, setPedidos] = useState<PedidoComCliente[]>([])
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    montado.current = true
    listarPedidos()
      .then((lista) => {
        if (!montado.current) return
        setPedidos(lista)
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar a agenda.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!carregado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-on-surface">Agenda</h1>
        <p className="text-sm text-on-surface-variant">Carregando...</p>
      </div>
    )
  }

  const hoje = hojeLocal()
  const pedidosComPrazo = pedidos
    .filter((pedido): pedido is PedidoComCliente & { prazoEntrega: string } => Boolean(pedido.prazoEntrega))
    .sort((a, b) => a.prazoEntrega.localeCompare(b.prazoEntrega))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Agenda</h1>
        <p className="text-label-sm text-on-surface-variant">Pedidos com prazo de entrega definido, do mais próximo ao mais distante.</p>
      </div>

      {pedidosComPrazo.length === 0 ? (
        <EmptyState
          titulo="Nenhum pedido com prazo definido"
          descricao="Abra um pedido e defina um prazo de entrega para vê-lo aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidosComPrazo.map((pedido) => {
            const atrasado = pedido.prazoEntrega < hoje
            const progresso = Math.min(100, Math.max(0, pedido.progresso ?? 0))
            return (
              <Card key={pedido.id} className="glow-hover">
                <Link to="/pedidos/$pedidoId" params={{ pedidoId: String(pedido.id) }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-on-surface">Cliente: {pedido.nomeCliente}</p>
                      {pedido.etapa && <p className="text-label-sm text-on-surface-variant">{pedido.etapa}</p>}
                    </div>
                    <Badge variant={atrasado ? 'danger' : 'neutral'}>
                      {atrasado ? `Atrasado — ${pedido.prazoEntrega}` : pedido.prazoEntrega}
                    </Badge>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </Link>
              </Card>
            )
          })}
        </ul>
      )}
    </div>
  )
}
