import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { criarPedido, listarPedidos, excluirPedido, listarPecaIdsJaVinculadas, editarPecasPedido, concluirVendaPedido, type PedidoComCliente } from './pedidosRepo'
import { listarClientes, type ClienteDecifrado } from './clientesRepo'
import { listarPecas, type PecaComForma } from '../producao/pecasRepo'
import { listarContas, type ContaDecifrada } from '../financeiro/contasRepo'

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
  const [pedidoEditando, setPedidoEditando] = useState<PedidoComCliente | null>(null)
  const [pecasEditadas, setPecasEditadas] = useState<number[]>([])
  const [pedidoVenda, setPedidoVenda] = useState<PedidoComCliente | null>(null)
  const [contas, setContas] = useState<ContaDecifrada[]>([])
  const [contaVenda, setContaVenda] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function recarregar() {
    const [listaPedidos, listaClientes, listaPecas, vinculadas, listaContas] = await Promise.all([
      listarPedidos(),
      listarClientes(),
      listarPecas(),
      listarPecaIdsJaVinculadas(),
      listarContas(),
    ])
    if (!montado.current) return
    setPedidos(listaPedidos)
    setClientes(listaClientes)
    setPecas(listaPecas)
    setPecaIdsVinculadas(vinculadas)
    setContas(listaContas)
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

  const pecasDisponiveis = pecas.filter((peca) => !pecaIdsVinculadas.includes(peca.id!) && peca.status !== 'vendida' && peca.status !== 'cancelada')
  const faltamPreRequisitos = clientes.length === 0 || pecasDisponiveis.length === 0

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (!clienteId || pecaIdsSelecionadas.length === 0) return

    const clienteIdNumero = Number(clienteId)
    const pecaIdsEnviadas = pecaIdsSelecionadas
    const nomeCliente = clientes.find((cliente) => cliente.id === clienteIdNumero)?.nome ?? '—'
    const valorTotal = pecaIdsEnviadas.reduce((soma, pecaId) => {
      const peca = pecas.find((p) => p.id === pecaId)
      return soma + Math.round((peca?.precoVenda ?? 0) * 100)
    }, 0) / 100
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

  async function handleSalvarEdicao() {
    if (!pedidoEditando?.id || salvando) return
    setSalvando(true)
    try {
      await editarPecasPedido(pedidoEditando.id, pecasEditadas)
      setPedidoEditando(null)
      await recarregar()
      mostrarToast('Pedido atualizado com sucesso')
    } catch (falha) { mostrarToast(falha instanceof Error ? falha.message : 'Erro ao atualizar pedido.', 'erro') }
    finally { setSalvando(false) }
  }

  async function handleConcluirVenda() {
    if (!pedidoVenda?.id || salvando) return
    if (!contaVenda) { mostrarToast('Selecione a carteira que receberá a venda.', 'erro'); return }
    setSalvando(true)
    try {
      await concluirVendaPedido(pedidoVenda.id, Number(contaVenda), pedidoVenda.valorTotal)
      setPedidoVenda(null)
      setContaVenda('')
      await recarregar()
      mostrarToast('Venda registrada na carteira!')
    } catch (falha) { mostrarToast(falha instanceof Error ? falha.message : 'Erro ao registrar venda.', 'erro') }
    finally { setSalvando(false) }
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
        <h2 className="mb-4 text-sm font-semibold text-on-surface">Todos os Pedidos</h2>
        {pedidos.length === 0 ? (
          <EmptyState titulo="Nenhum pedido cadastrado" descricao="Crie o primeiro pedido do seu ateliê." />
        ) : (
          <div className="relative pl-6 sm:pl-32 flex flex-col gap-5 before:absolute before:left-2.5 sm:before:left-[108px] before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/40 before:border-r before:border-dashed before:border-outline-variant/60">
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
                <div key={pedido.id} className="relative flex flex-col sm:flex-row items-start gap-4">
                  {/* Rótulo Esquerda (Desktop) */}
                  <div className="hidden sm:flex flex-col items-end w-24 shrink-0 pt-1 text-right">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                      PEDIDO
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      #{pedido.id}
                    </span>
                  </div>

                  {/* Marcador Central (Node Dot) */}
                  <div className="absolute -left-6 sm:static sm:left-auto pt-1 shrink-0 z-10">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shadow-sm ${
                        statusVariant === 'success'
                          ? 'border-success bg-success/20 text-success'
                          : statusVariant === 'danger'
                          ? 'border-error bg-error/20 text-error'
                          : statusVariant === 'warning'
                          ? 'border-warning bg-warning/20 text-warning'
                          : 'border-primary bg-primary/20 text-primary'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  </div>

                  {/* Card de Conteúdo à Direita */}
                  <Card className="flex-1 w-full glow-hover flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden text-xs font-semibold uppercase text-on-surface">
                          PEDIDO #{pedido.id}
                        </span>
                        <Badge variant={statusVariant} className="uppercase font-bold tracking-wider text-[10px] px-2.5 py-0.5">
                          {statusFormatado}
                        </Badge>
                        {pedido.vendaRegistradaEm && <Badge variant="success">Venda concluída</Badge>}
                      </div>
                      <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                        R$ {pedido.valorTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary text-base font-bold">
                          🛍️
                        </div>
                        <div className="flex flex-col min-w-0">
                          <Link to="/pedidos/$pedidoId" params={{ pedidoId: String(pedido.id) }} className="hover:underline font-semibold text-on-surface text-base truncate">
                            Cliente: {pedido.nomeCliente}
                          </Link>
                          <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                            {pedido.pecaIds.length} peça(s) no pedido · Data: {new Date(pedido.criadoEm).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button variante="ghost" className="text-xs" disabled={!pedido.id || pedido.id < 0 || !!pedido.vendaRegistradaEm || pedido.status === 'cancelado'} onClick={() => { setPedidoEditando(pedido); setPecasEditadas([...pedido.pecaIds]) }}>Editar pedido</Button>
                        <Button variante="primary" className="text-xs" disabled={!pedido.id || pedido.id < 0 || !!pedido.vendaRegistradaEm || pedido.status === 'cancelado'} onClick={() => { setPedidoVenda(pedido); setContaVenda('') }}>Concluir venda</Button>
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
                </div>
              )
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        aberto={pedidoEditando !== null}
        titulo="Editar peças do pedido"
        descricao="Selecione as peças deste pedido. O cliente permanece o mesmo."
        onConfirmar={handleSalvarEdicao}
        onCancelar={() => setPedidoEditando(null)}
      >
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {pecas.filter(p => p.id && (pedidoEditando?.pecaIds.includes(p.id) || (!pecaIdsVinculadas.includes(p.id) && p.status !== 'vendida' && p.status !== 'cancelada'))).map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-on-surface"><input type="checkbox" checked={pecasEditadas.includes(p.id!)} onChange={() => setPecasEditadas(atuais => atuais.includes(p.id!) ? atuais.filter(id => id !== p.id) : [...atuais, p.id!])} />{p.nome} — R$ {(p.precoVenda ?? 0).toFixed(2)}</label>
          ))}
        </div>
      </ConfirmModal>

      <ConfirmModal
        aberto={pedidoVenda !== null}
        titulo="Concluir venda do pedido"
        descricao={`O valor de R$ ${(pedidoVenda?.valorTotal ?? 0).toFixed(2)} será registrado como entrada na carteira selecionada.`}
        onConfirmar={handleConcluirVenda}
        onCancelar={() => setPedidoVenda(null)}
      >
        <div className="flex flex-col gap-1"><label htmlFor="conta-venda-pedido" className="text-sm font-medium text-on-surface">Carteira</label><select id="conta-venda-pedido" value={contaVenda} onChange={e => setContaVenda(e.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"><option value="">Selecione a carteira</option>{contas.map(conta => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select>{contas.length === 0 && <p className="text-xs text-error">Cadastre uma carteira antes de registrar a venda.</p>}</div>
      </ConfirmModal>

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
