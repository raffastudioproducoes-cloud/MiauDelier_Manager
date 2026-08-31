import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/useToast'
import { obterResumoDashboard, type ResumoDashboard } from './dashboardRepo'
import { FluxoCaixaChart } from './FluxoCaixaChart'

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
        <section>
          <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
            <div className="glow-hover min-w-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant/10 bg-surface p-4">
              <p className="mb-1 text-label-sm text-on-surface-variant">Saldo total</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.saldoTotal)}</p>
            </div>
            <div className="glow-hover min-w-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant/10 bg-surface p-4">
              <p className="mb-1 text-label-sm text-on-surface-variant">Lucro do mês</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.lucroDoMes)}</p>
            </div>
            <div className="glow-hover min-w-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant/10 bg-surface p-4">
              <p className="mb-1 text-label-sm text-on-surface-variant">Peças em produção</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.pecasEmProducao}</p>
            </div>
            <div className="glow-hover min-w-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant/10 bg-surface p-4">
              <p className="mb-1 text-label-sm text-on-surface-variant">Peças em cura</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.pecasEmCura}</p>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="glow-hover min-w-[160px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-outline-variant/10 bg-surface p-4"
              onClick={() => navigate({ to: '/materiais' })}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') navigate({ to: '/materiais' })
              }}
            >
              <p className="mb-1 text-label-sm text-on-surface-variant">Estoque baixo</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.materiaisEstoqueBaixo}</p>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="glow-hover min-w-[160px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-outline-variant/10 bg-surface p-4"
              onClick={() => navigate({ to: '/pedidos' })}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') navigate({ to: '/pedidos' })
              }}
            >
              <p className="mb-1 text-label-sm text-on-surface-variant">Pedidos em aberto</p>
              <p className="text-headline-sm font-semibold text-primary">{resumo.pedidosAbertos}</p>
            </div>
          </div>
        </section>
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
          <div className="rounded-xl border border-outline-variant/10 bg-surface p-4 lg:col-span-2">
            <FluxoCaixaChart dados={resumo.fluxoCaixa14Dias} />
          </div>
          <div className="rounded-xl border border-outline-variant/10 bg-surface p-4">
            <p className="mb-2 text-sm font-medium text-on-surface">Eventos recentes de produção</p>
            {resumo.eventosRecentes.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Nenhum evento registrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {resumo.eventosRecentes.map((evento, indice) => (
                  <li key={`${evento.pecaId}-${indice}`} className="text-sm">
                    <Badge variant="neutral">{evento.tipo}</Badge>{' '}
                    <span className="font-medium text-on-surface">{evento.nomePeca}</span>
                    <p className="text-xs text-on-surface-variant">{evento.descricao}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
