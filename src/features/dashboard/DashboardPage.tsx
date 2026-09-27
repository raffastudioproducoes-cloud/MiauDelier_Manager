import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
            <Card className="glow-hover glow-corner overflow-hidden">
              <p className="mb-1 text-label-sm text-on-surface-variant">Saldo total</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.saldoTotal)}</p>
            </Card>
            <Card className="glow-hover overflow-hidden">
              <p className="mb-1 text-label-sm text-on-surface-variant">Lucro do mês</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.lucroDoMes)}</p>
            </Card>
            <Card className="glow-hover overflow-hidden">
              <p className="mb-1 text-label-sm text-on-surface-variant">Peças em produção</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.pecasEmProducao}</p>
            </Card>
            <Card className="glow-hover overflow-hidden">
              <p className="mb-1 text-label-sm text-on-surface-variant">Peças em cura</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.pecasEmCura}</p>
            </Card>
            <Card
              role="button"
              tabIndex={0}
              className="glow-hover cursor-pointer overflow-hidden"
              onClick={() => navigate({ to: '/materiais' })}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') navigate({ to: '/materiais' })
              }}
            >
              <p className="mb-1 text-label-sm text-on-surface-variant">Estoque baixo</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.materiaisEstoqueBaixo}</p>
            </Card>
            <Card
              role="button"
              tabIndex={0}
              className="glow-hover cursor-pointer overflow-hidden"
              onClick={() => navigate({ to: '/pedidos' })}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') navigate({ to: '/pedidos' })
              }}
            >
              <p className="mb-1 text-label-sm text-on-surface-variant">Pedidos em aberto</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.pedidosAbertos}</p>
            </Card>
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
