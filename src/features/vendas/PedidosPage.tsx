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
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Pedidos</h1>

      {faltamPreRequisitos && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Cadastre pelo menos um cliente e uma peça antes de criar um pedido.
        </p>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="cliente-pedido" className="text-sm font-medium">Cliente</label>
          <select id="cliente-pedido" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="rounded-lg px-3 py-2 elevation-inset">
            <option value="">Selecione</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>

          <p className="text-sm font-medium">Peças</p>
          {pecasDisponiveis.map((peca) => (
            <label key={peca.id} className="flex items-center gap-2">
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

      {pedidos.length === 0 ? (
        <EmptyState titulo="Nenhum pedido cadastrado" descricao="Crie o primeiro pedido do seu ateliê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {pedidos.map((pedido) => (
            <Card key={pedido.id} className="flex items-center justify-between">
              <Link to="/pedidos/$pedidoId" params={{ pedidoId: String(pedido.id) }} className="flex-1">
                <p className="font-medium">Cliente: {pedido.nomeCliente}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  R$ {pedido.valorTotal.toFixed(2)}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{pedido.status}</Badge>
                <Button variante="ghost" onClick={() => setPedidoExcluindoId(pedido.id ?? null)}>Excluir</Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <ConfirmModal
        aberto={pedidoExcluindoId !== null}
        titulo="Excluir pedido?"
        descricao="As peças vinculadas continuam marcadas como já vinculadas a um pedido."
        onConfirmar={() => pedidoExcluindoId !== null && handleExcluir(pedidoExcluindoId)}
        onCancelar={() => setPedidoExcluindoId(null)}
      />
    </div>
  )
}
