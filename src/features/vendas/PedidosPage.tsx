import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { criarPedido, listarPedidos, type PedidoComCliente } from './pedidosRepo'
import { listarClientes, type ClienteDecifrado } from './clientesRepo'
import { listarPecas, type PecaComForma } from '../producao/pecasRepo'

export function PedidosPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [pedidos, setPedidos] = useState<PedidoComCliente[]>([])
  const [clientes, setClientes] = useState<ClienteDecifrado[]>([])
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [clienteId, setClienteId] = useState('')
  const [pecaIdsSelecionadas, setPecaIdsSelecionadas] = useState<number[]>([])
  const [carregado, setCarregado] = useState(false)

  async function recarregar() {
    const [listaPedidos, listaClientes, listaPecas] = await Promise.all([
      listarPedidos(),
      listarClientes(),
      listarPecas(),
    ])
    if (!montado.current) return
    setPedidos(listaPedidos)
    setClientes(listaClientes)
    setPecas(listaPecas)
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

  const faltamPreRequisitos = clientes.length === 0 || pecas.length === 0

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (!clienteId || pecaIdsSelecionadas.length === 0) return

    const clienteIdNumero = Number(clienteId)
    const pecaIdsEnviadas = pecaIdsSelecionadas
    const nomeCliente = clientes.find((cliente) => cliente.id === clienteIdNumero)?.nome ?? '—'
    // Atualização otimista: exibe o pedido imediatamente, antes da escrita no banco,
    // para não depender do tempo de resposta assíncrono do IndexedDB na renderização.
    const pedidoOtimista: PedidoComCliente = {
      id: -Date.now(),
      clienteId: clienteIdNumero,
      pecaIds: pecaIdsEnviadas,
      status: 'aberto',
      criadoEm: new Date().toISOString(),
      nomeCliente,
    }
    setPedidos((atual) => [...atual, pedidoOtimista])
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
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao criar pedido.', 'erro')
    }
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
          {pecas.map((peca) => (
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
              <p className="font-medium">Cliente: {pedido.nomeCliente}</p>
              <Badge variant="neutral">{pedido.status}</Badge>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
