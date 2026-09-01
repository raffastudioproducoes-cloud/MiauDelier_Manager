import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { obterResumoAnalytics, type ResumoAnalytics } from './analyticsRepo'

const RESUMO_VAZIO: ResumoAnalytics = {
  porMes: [],
  receitaTotal: 0,
  despesaTotal: 0,
  resultado: 0,
  margem: 0,
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarPorcentagem(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function mesPadrao(offset: number): string {
  const data = new Date()
  data.setMonth(data.getMonth() + offset)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

function GraficoBarras({ porMes }: { porMes: ResumoAnalytics['porMes'] }) {
  const maiorValor = Math.max(1, ...porMes.flatMap((ponto) => [ponto.receita, ponto.despesa]))
  return (
    <div className="flex items-end gap-4 overflow-x-auto pb-2">
      {porMes.map((ponto) => (
        <div key={ponto.mes} className="flex flex-shrink-0 flex-col items-center gap-1">
          <div className="flex h-32 items-end gap-1">
            <div
              className="w-4 rounded-t bg-[var(--color-success)] opacity-85"
              style={{ height: `${(ponto.receita / maiorValor) * 100}%` }}
              title={`Receita: ${formatarMoeda(ponto.receita)}`}
            />
            <div
              className="w-4 rounded-t bg-[var(--color-danger)] opacity-85"
              style={{ height: `${(ponto.despesa / maiorValor) * 100}%` }}
              title={`Despesa: ${formatarMoeda(ponto.despesa)}`}
            />
          </div>
          <span className="text-xs text-on-surface-variant">{ponto.mes}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [mesInicio, setMesInicio] = useState(mesPadrao(-5))
  const [mesFim, setMesFim] = useState(mesPadrao(0))
  const [resumo, setResumo] = useState<ResumoAnalytics>(RESUMO_VAZIO)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    if (mesInicio > mesFim) {
      setResumo(RESUMO_VAZIO)
      setCarregado(true)
      return
    }
    setCarregado(false)
    obterResumoAnalytics(mesInicio, mesFim)
      .then((dados) => {
        if (!montado.current) return
        setResumo(dados)
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar o resumo de analytics.', 'erro')
        setCarregado(true)
      })
  }, [mesInicio, mesFim])

  const periodoInvalido = mesInicio > mesFim

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-sm font-semibold text-on-surface">Analytics</h1>
        <p className="text-label-sm text-on-surface-variant">Receita, despesa e margem por período.</p>
      </div>

      <Card className="bg-surface">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            Início
            <input
              type="month"
              value={mesInicio}
              onChange={(evento) => setMesInicio(evento.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-on-surface"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            Fim
            <input
              type="month"
              value={mesFim}
              onChange={(evento) => setMesFim(evento.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-on-surface"
            />
          </label>
        </div>
      </Card>

      {periodoInvalido ? (
        <Card>
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            Preencha um período válido (início não pode ser depois do fim).
          </p>
        </Card>
      ) : !carregado ? (
        <p>Carregando...</p>
      ) : resumo.porMes.length === 0 ? (
        <EmptyState titulo="Nenhuma transação no período" descricao="Ajuste o intervalo de meses acima para ver os dados." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="bg-surface">
              <p className="mb-1 text-label-sm text-on-surface-variant">Receita</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.receitaTotal)}</p>
            </Card>
            <Card className="bg-surface">
              <p className="mb-1 text-label-sm text-on-surface-variant">Despesa</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.despesaTotal)}</p>
            </Card>
            <Card className="bg-surface">
              <p className="mb-1 text-label-sm text-on-surface-variant">Resultado</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarMoeda(resumo.resultado)}</p>
            </Card>
            <Card className="bg-surface">
              <p className="mb-1 text-label-sm text-on-surface-variant">Margem</p>
              <p className="text-headline-sm font-semibold text-primary">{formatarPorcentagem(resumo.margem)}</p>
            </Card>
          </div>

          <Card className="bg-surface">
            <p className="mb-2 text-sm font-medium text-on-surface">Receita x despesa por mês</p>
            <GraficoBarras porMes={resumo.porMes} />
          </Card>
        </>
      )}
    </div>
  )
}
