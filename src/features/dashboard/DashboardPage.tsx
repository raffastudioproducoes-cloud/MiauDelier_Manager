import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ReactNode, KeyboardEvent, KeyboardEventHandler } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/useToast'
import { obterResumoDashboard, type ResumoDashboard } from './dashboardRepo'
import { FluxoCaixaChart } from './FluxoCaixaChart'
import { ResumoLojaCard } from './ResumoLojaCard'

const RESUMO_VAZIO: ResumoDashboard = {
  saldoTotal: 0,
  lucroDoMes: 0,
  pecasEmProducao: 0,
  pecasEmCura: 0,
  materiaisEstoqueBaixo: 0,
  pedidosAbertos: 0,
  fluxoCaixa14Dias: [],
  eventosRecentes: [],
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CardKPI_Click({
  label,
  value,
  icon,
  destination,
  onClick,
  onKeyDown,
}: {
  label: string
  value: string
  icon?: ReactNode
  destination?: { to: string }
  onClick?: () => void
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
}) {
  return (
    <Card
      variant="kpi"
      icon={icon}
      label={label}
      value={value}
      className="glow-hover overflow-hidden"
      role={destination ? 'button' : undefined}
      tabIndex={destination ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    />
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [resumo, setResumo] = useState<ResumoDashboard>(RESUMO_VAZIO)
  const [carregado, setCarregado] = useState(false)
  const [erroCarga, setErroCarga] = useState(false)

  useEffect(() => {
    montado.current = true
    obterResumoDashboard()
      .then((dados) => {
        if (!montado.current) return
        setResumo(dados)
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar o resumo.', 'erro')
        setErroCarga(true)
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
  }, [])

  if (!carregado) {
    return <p>Carregando...</p>
  }

  function navegarPara(modo: '/materiais' | '/pedidos') {
    navigate({ to: modo })
  }

  function handleAtalhoKeyDown(
    evento: KeyboardEvent<HTMLDivElement>,
    destino: '/materiais' | '/pedidos',
  ) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      navegarPara(destino)
    }
  }

  function CardKPI_Click({
    label,
    value,
    icon,
    destination,
  }: {
    label: string
    value: string | number
    icon?: ReactNode
    destination?: '/materiais' | '/pedidos'
  }) {
    return (
      <Card
        variant="kpi"
        icon={icon}
        label={label}
        value={value}
        className="glow-hover overflow-hidden"
        role={destination ? 'button' : undefined}
        tabIndex={destination ? 0 : undefined}
        onClick={destination ? () => navegarPara(destination) : undefined}
        onKeyDown={
          destination
            ? (evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                  evento.preventDefault()
                  navegarPara(destination)
                }
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-sm font-semibold text-on-surface">Início</h1>
        <p className="text-label-sm text-on-surface-variant">Visão geral do seu atelier.</p>
      </div>

      {erroCarga ? (
        <Card>
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            Não foi possível carregar o resumo. Tente novamente.
          </p>
        </Card>
      ) : (
        <>
          <ResumoLojaCard resumo={resumo} />
          <section>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Card
                variant="kpi"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                label="Saldo total"
                value={formatarMoeda(resumo.saldoTotal)}
                className="glow-hover glow-corner overflow-hidden"
              />
              <Card
                variant="kpi"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                label="Lucro do mês"
                value={formatarMoeda(resumo.lucroDoMes)}
                className="glow-hover overflow-hidden"
              />
              <Card
                variant="kpi"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                }
                label="Peças em produção"
                value={resumo.pecasEmProducao}
                className="glow-hover overflow-hidden"
              />
              <Card
                variant="kpi"
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                }
                label="Peças em cura"
                value={resumo.pecasEmCura}
                className="glow-hover overflow-hidden"
              />
              <CardKPI_Click
                label="Estoque baixo"
                value={resumo.materiaisEstoqueBaixo}
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                }
                destination="/materiais"
                onClick={() => navegarPara('/materiais')}
                onKeyDown={(evento) => handleAtalhoKeyDown(evento, '/materiais')}
              />
              <CardKPI_Click
                label="Pedidos em aberto"
                value={resumo.pedidosAbertos}
                icon={
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                }
                destination="/pedidos"
                onClick={() => navegarPara('/pedidos')}
                onKeyDown={(evento) => handleAtalhoKeyDown(evento, '/pedidos')}
              />
            </div>
          </section>
        </>
      )}

      <section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Button onClick={() => navigate({ to: '/pecas' })}>Nova peça</Button>
          <Button onClick={() => navigate({ to: '/pedidos' })}>Novo pedido</Button>
          <Button onClick={() => navigate({ to: '/materiais' })}>Novo material</Button>
          <Button onClick={() => navigate({ to: '/transacoes' })}>Nova transação</Button>
        </div>
      </section>

      {!erroCarga && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <FluxoCaixaChart dados={resumo.fluxoCaixa14Dias} />
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              <span>⚡</span> Eventos recentes de produção
            </h2>
            {resumo.eventosRecentes.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Nenhum evento registrado ainda.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {resumo.eventosRecentes.map((evento, indice) => {
                  const ehCura = evento.tipo.includes('CURA')
                  const ehMaterial = evento.tipo.includes('MATERIAL')
                  const ehVenda = evento.tipo.includes('VENDA')
                  const icone = ehCura ? '🧪' : ehMaterial ? '📦' : ehVenda ? '💰' : '✨'
                  const variantBadge = ehCura ? 'warning' : ehVenda ? 'success' : 'neutral'

                  return (
                    <div
                      key={`${evento.pecaId}-${indice}`}
                      className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-3 flex flex-col gap-1.5 hover:border-primary/40 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{icone}</span>
                          <span className="font-semibold text-xs text-on-surface truncate">{evento.nomePeca}</span>
                        </div>
                        <Badge variant={variantBadge} className="shrink-0 text-[10px] px-1.5 py-0.5 uppercase tracking-wider">
                          {evento.tipo.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed pl-5">{evento.descricao}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
