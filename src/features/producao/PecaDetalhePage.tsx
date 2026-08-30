import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { listarPecas, listarConsumosDaPeca, listarEventosDaPeca, type PecaComForma, type ConsumoComMaterial } from './pecasRepo'
import type { EventoPeca } from '../../db/schema'

const routeApi = getRouteApi('/pecas/$pecaId')

export function PecaDetalhePage() {
  const { pecaId } = routeApi.useParams()
  const { mostrarToast } = useToast()
  const [peca, setPeca] = useState<PecaComForma | undefined>(undefined)
  const [consumos, setConsumos] = useState<ConsumoComMaterial[]>([])
  const [eventos, setEventos] = useState<EventoPeca[]>([])
  const [carregado, setCarregado] = useState(false)

  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    const id = Number(pecaId)
    async function carregar() {
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
    carregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peça.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [pecaId])

  if (!carregado) return null

  if (!peca) {
    return <EmptyState titulo="Peça não encontrada" descricao="Ela pode ter sido excluída." />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{peca.nome}</h1>
        <Badge variant="neutral">{peca.status}</Badge>
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
    </div>
  )
}
