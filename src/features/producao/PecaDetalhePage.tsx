import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { z } from 'zod'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import {
  listarPecas,
  listarConsumosDaPeca,
  listarEventosDaPeca,
  atualizarStatusPeca,
  atualizarPrecoVendaPeca,
  type PecaComForma,
  type ConsumoComMaterial,
} from './pecasRepo'
import { listarContas } from '../financeiro/contasRepo'
import { criarTransacao } from '../financeiro/transacoesRepo'
import type { EventoPeca, StatusPeca } from '../../db/schema'

const routeApi = getRouteApi('/pecas/$pecaId')

const OPCOES_STATUS: StatusPeca[] = ['planejada', 'em_producao', 'curando', 'acabamento', 'pronta', 'vendida']

const schemaValorVenda = z.coerce.number().min(0.01, 'Informe um valor de venda maior que zero')

export function PecaDetalhePage() {
  const { pecaId } = routeApi.useParams()
  const { mostrarToast } = useToast()
  const [peca, setPeca] = useState<PecaComForma | undefined>(undefined)
  const [consumos, setConsumos] = useState<ConsumoComMaterial[]>([])
  const [eventos, setEventos] = useState<EventoPeca[]>([])
  const [carregado, setCarregado] = useState(false)
  const [vendaAberta, setVendaAberta] = useState(false)
  const [valorVenda, setValorVenda] = useState('')
  const [erroValorVenda, setErroValorVenda] = useState<string | null>(null)

  const montado = useRef(true)
  const id = Number(pecaId)

  async function recarregar() {
    const [pecas, consumosCarregados, eventosCarregados] = await Promise.all([
      listarPecas(),
      listarConsumosDaPeca(id),
      listarEventosDaPeca(id),
    ])
    if (!montado.current) return
    setPeca(pecas.find((p) => p.id === id))
    setConsumos(consumosCarregados)
    setEventos(eventosCarregados)
    setCarregado(true)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peça.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [pecaId])

  async function handleMudarStatus(novoStatus: StatusPeca) {
    if (novoStatus === 'vendida') {
      setValorVenda(peca?.precoVenda ? String(peca.precoVenda) : '')
      setErroValorVenda(null)
      setVendaAberta(true)
      return
    }
    try {
      await atualizarStatusPeca(id, novoStatus)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao atualizar status.', 'erro')
      return
    }
    if (!montado.current) return
    await recarregar()
  }

  async function handleConfirmarVenda() {
    const resultado = schemaValorVenda.safeParse(valorVenda)
    if (!resultado.success) {
      setErroValorVenda(resultado.error.issues[0]?.message ?? 'Valor inválido')
      return
    }
    setErroValorVenda(null)

    try {
      const contas = await listarContas()
      if (contas.length === 0) {
        mostrarToast('Cadastre uma conta antes de registrar uma venda.', 'erro')
        return
      }
      await atualizarStatusPeca(id, 'vendida')
      await atualizarPrecoVendaPeca(id, resultado.data)
      await criarTransacao({
        contaId: contas[0].id,
        tipo: 'entrada',
        valor: resultado.data,
        descricao: `Venda: ${peca?.nome ?? ''}`,
        data: new Date().toISOString(),
      })
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao registrar venda.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Venda registrada com sucesso')
    setVendaAberta(false)
    await recarregar()
  }

  if (!carregado) return null

  if (!peca) {
    return <EmptyState titulo="Peça não encontrada" descricao="Ela pode ter sido excluída." />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{peca.nome}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">{peca.status}</Badge>
          <label htmlFor="status-peca" className="sr-only">Status</label>
          <select
            id="status-peca"
            value={peca.status}
            onChange={(e) => handleMudarStatus(e.target.value as StatusPeca)}
            className="rounded-lg px-3 py-2 elevation-inset"
          >
            {OPCOES_STATUS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-[var(--color-ink-muted)]">Forma: {peca.nomeForma}</p>

      <Card>
        <h2 className="mb-2 font-medium">Materiais consumidos</h2>
        {consumos.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Nenhum consumo registrado.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {consumos.map((consumo, indice) => (
              <li key={indice} className="text-sm">
                {consumo.nomeMaterial}: {consumo.quantidade}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">Histórico de eventos</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Nenhum evento registrado.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {eventos.map((evento) => (
              <li key={evento.id} className="text-sm">
                <span className="font-medium">{evento.tipo}</span> — {evento.descricao} ({new Date(evento.criadoEm).toLocaleString('pt-BR')})
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmModal
        aberto={vendaAberta}
        titulo="Confirmar venda"
        descricao="Registrar venda por este valor? Uma transação de entrada será criada."
        onConfirmar={handleConfirmarVenda}
        onCancelar={() => setVendaAberta(false)}
      >
        <TextField
          id="valor-venda"
          rotulo="Valor da venda"
          type="number"
          step="0.01"
          value={valorVenda}
          onChange={(e) => setValorVenda(e.target.value)}
          erro={erroValorVenda ?? undefined}
        />
      </ConfirmModal>
    </div>
  )
}
