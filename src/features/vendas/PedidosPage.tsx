import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { criarPedido, listarPedidos, excluirPedido, listarPecaIdsJaVinculadas, type PedidoComCliente } from './pedidosRepo'
import { listarClientes, type ClienteDecifrado } from './clientesRepo'
import { listarPecas, type PecaComForma } from '../producao/pecasRepo'

export function PedidosPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [pedidos, setPedidos] = useState<PedidoComCliente[]>([])
  const [clientes, setClientes] = useState<ClienteDecifrado[]>([])
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [pecaIdsVinculadas, setPecaIdsVinculadas] = useState<number[]>([])
  const [clienteId, setClienteId] = useState('')
  const [pecaIdsSelecionadas, setPecaIdsSelecionadas] = useState<number[]>([])
  const [carregado, setCarregado] = useState(false)
  const [pedidoExcluindoId, setPedidoExcluindoId] = useState<number | null>(null)

  async function recarregar() {
    const [listaPedidos, listaClientes, listaPecas, vinculadas] = await Promise.all([
      listarPedidos(),
      listarClientes(),
      listarPecas(),
      listarPecaIdsJaVinculadas(),
    ])
    if (!montado.current) return
    setPedidos(listaPedidos)
    setClientes(listaClientes)
    setPecas(listaPecas)
    setPecaIdsVinculadas(vinculadas)
  }

  useEffect(() => {
    montado.current = true
    recarregar()
      .then(() => {
        if (!montado.current) return
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar pedidos.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function alternarPeca(pecaId: number) {
    setPecaIdsSelecionadas((atual) =>
      atual.includes(pecaId) ? atual.filter((id) => id !== pecaId) : [...atual, pecaId],
    )
  }

  const pecasDisponiveis = pecas.filter((peca) => !pecaIdsVinculadas.includes(peca.id!))
  const faltamPreRequisitos = clientes.length === 0 || pecasDisponiveis.length === 0

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (!clienteId || pecaIdsSelecionadas.length === 0) return

    const clienteIdNumero = Number(clienteId)
    const pecaIdsEnviadas = pecaIdsSelecionadas
    const nomeCliente = clientes.find((cliente) => cliente.id === clienteIdNumero)?.nome ?? '—'
    const valorTotal = pecaIdsEnviadas.reduce((soma, pecaId) => {
      const peca = pecas.find((p) => p.id === pecaId)
      return soma + (peca?.precoVenda ?? 0)
    }, 0)
    // Atualização otimista: exibe o pedido imediatamente, antes da escrita no banco,
    // para não depender do tempo de resposta assíncrono do IndexedDB na renderização.
    const pedidoOtimista: PedidoComCliente = {
      id: -Date.now(),
      clienteId: clienteIdNumero,
      pecaIds: pecaIdsEnviadas,
      status: 'aberto',
      criadoEm: new Date().toISOString(),
      nomeCliente,
      valorTotal,
    }
    setPedidos((atual) => [...atual, pedidoOtimista])
    setPecaIdsVinculadas((atual) => [...atual, ...pecaIdsEnviadas])
    setClienteId('')
    setPecaIdsSelecionadas([])

    try {
      const novoId = await criarPedido({ clienteId: clienteIdNumero, pecaIds: pecaIdsEnviadas })
      if (!montado.current) return
      setPedidos((atual) => atual.map((pedido) => (pedido === pedidoOtimista ? { ...pedido, id: novoId } : pedido)))
      mostrarToast('Pedido criado com sucesso')
    } catch (falha) {
      if (!montado.current) return
      setPedidos((atual) => atual.filter((pedido) => pedido !== pedidoOtimista))
      setPecaIdsVinculadas((atual) => atual.filter((id) => !pecaIdsEnviadas.includes(id)))
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao criar pedido.', 'erro')
    }
  }

  async function handleExcluir(pedidoId: number) {
    try {
      await excluirPedido(pedidoId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir pedido.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Pedido excluído com sucesso')
    setPedidoExcluindoId(null)
    await recarregar()
  }

  if (!carregado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-on-surface">Pedidos</h1>
        <p className="text-sm text-on-surface-variant">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Pedidos</h1>
        <p className="text-label-sm text-on-surface-variant">Encomendas do atelier por situação.</p>
      </div>

      {faltamPreRequisitos && (
        <p role="alert" className="text-sm text-error">
          Cadastre pelo menos um cliente e uma peça antes de criar um pedido.
        </p>
      )}

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Criar pedido</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="cliente-pedido" className="text-sm font-medium text-on-surface">Cliente</label>
            <select
              id="cliente-pedido"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Selecione</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>

          <p className="text-sm font-medium text-on-surface">Peças</p>
          {pecasDisponiveis.map((peca) => (
            <label key={peca.id} className="flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={pecaIdsSelecionadas.includes(peca.id!)}
                onChange={() => alternarPeca(peca.id!)}
              />
              {peca.nome}
            </label>
          ))}

          <Button type="submit" disabled={faltamPreRequisitos || !clienteId || pecaIdsSelecionadas.length === 0}>
            Criar pedido
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Todos os Pedidos</h2>
        {pedidos.length === 0 ? (
          <EmptyState titulo="Nenhum pedido cadastrado" descricao="Crie o primeiro pedido do seu ateliê." />
        ) : (
          <div className="flex flex-col gap-3">
            {pedidos.map((pedido) => {
              const statusStr = pedido.status || 'orçamento'
              const statusFormatado = statusStr.toUpperCase().replace('_', ' ')
              const statusVariant =
                statusStr.includes('concluido') || statusStr.includes('entregue')
                  ? 'success'
                  : statusStr.includes('cancelado')
                  ? 'danger'
                  : statusStr.includes('andamento') || statusStr.includes('producao')
                  ? 'warning'
                  : 'neutral'

              return (
                <Card key={pedido.id} className="glow-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary text-base font-bold">
                      🛍️
                    </div>
                    <div className="flex flex-col min-w-0">
                      <Link to="/pedidos/$pedidoId" params={{ pedidoId: String(pedido.id) }} className="hover:underline font-semibold text-on-surface text-base truncate">
                        Pedido #{pedido.id} · {pedido.nomeCliente}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                          R$ {pedido.valorTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/30">
                    <Badge variant={statusVariant} className="uppercase font-bold tracking-wider text-[10px] px-2.5 py-1">
                      {statusFormatado}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Link to="/pedidos/$pedidoId" params={{ pedidoId: String(pedido.id) }}>
                        <Button variante="ghost" className="text-xs">
                          Ver pedido →
                        </Button>
                      </Link>
                      <Button variante="ghost" className="text-xs text-error hover:bg-error/10" onClick={() => setPedidoExcluindoId(pedido.id ?? null)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        aberto={pedidoExcluindoId !== null}
        titulo="Excluir pedido?"
        descricao="As peças vinculadas ficam disponíveis novamente para novos pedidos."
        onConfirmar={() => pedidoExcluindoId !== null && handleExcluir(pedidoExcluindoId)}
        onCancelar={() => setPedidoExcluindoId(null)}
      />
    </div>
  )
}
