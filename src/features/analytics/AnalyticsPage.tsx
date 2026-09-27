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

function formatarNomeMes(mesAno: string): string {
  try {
    const [ano, mes] = mesAno.split('-').map(Number)
    const dataObj = new Date(ano, mes - 1, 1)
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[dataObj.getMonth()]} ${String(ano).slice(2)}`
  } catch {
    return mesAno
  }
}

function GraficoBarras({ porMes }: { porMes: ResumoAnalytics['porMes'] }) {
  const [mesHover, setMesHover] = useState<number | null>(null)
  const maiorValor = Math.max(100, ...porMes.flatMap((ponto) => [ponto.receita, ponto.despesa]))

  const SVG_WIDTH = 750
  const SVG_HEIGHT = 220
  const PADDING_LEFT = 60
  const PADDING_RIGHT = 30
  const PADDING_TOP = 25
  const PADDING_BOTTOM = 35

  const chartWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const chartHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM

  // Linhas de Grade Verticais (Eixo Y)
  const gridSteps = 4
  const gridYValues = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = (maiorValor / gridSteps) * (gridSteps - i)
    const y = PADDING_TOP + (chartHeight / gridSteps) * i
    return { val, y }
  })

  const larguraGrupo = chartWidth / Math.max(1, porMes.length)
  const larguraBarra = Math.min(22, (larguraGrupo - 16) / 2)

  const pontoAtivo = mesHover !== null && porMes[mesHover] ? porMes[mesHover] : porMes[porMes.length - 1]

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative w-full overflow-hidden rounded-2xl bg-surface-container-lowest/40 p-3 border border-outline-variant/20 shadow-inner">
        {/* Legenda de Cores */}
        <div className="flex items-center justify-end gap-4 text-xs font-semibold mb-2 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
            <span className="text-on-surface-variant">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]" />
            <span className="text-on-surface-variant">Despesa</span>
          </div>
        </div>

        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico comparativo de Receita x Despesa por mês"
          className="overflow-visible"
        >
          {/* Linhas de Grade Horizontal do Eixo Y */}
          {gridYValues.map(({ val, y }, idx) => (
            <g key={idx}>
              <line x1={PADDING_LEFT} y1={y} x2={SVG_WIDTH - PADDING_RIGHT} y2={y} stroke="var(--color-outline-variant)" strokeOpacity={0.15} strokeWidth={1} />
              <text x={PADDING_LEFT - 10} y={y + 4} textAnchor="end" className="text-[10px] font-semibold fill-on-surface-variant/70">
                {formatarMoeda(val)}
              </text>
            </g>
          ))}

          {/* Barras Agrupadas por Mês */}
          {porMes.map((ponto, i) => {
            const centroGrupoX = PADDING_LEFT + i * larguraGrupo + larguraGrupo / 2
            const alturaReceita = (ponto.receita / maiorValor) * chartHeight
            const alturaDespesa = (ponto.despesa / maiorValor) * chartHeight

            const yReceita = PADDING_TOP + chartHeight - alturaReceita
            const yDespesa = PADDING_TOP + chartHeight - alturaDespesa

            const xReceita = centroGrupoX - larguraBarra - 2
            const xDespesa = centroGrupoX + 2

            const estaHovered = mesHover === i

            return (
              <g
                key={ponto.mes}
                onMouseEnter={() => setMesHover(i)}
                onMouseLeave={() => setMesHover(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Retângulo de captação de Hover */}
                <rect
                  x={PADDING_LEFT + i * larguraGrupo}
                  y={PADDING_TOP}
                  width={larguraGrupo}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Barra Receita */}
                <rect
                  x={xReceita}
                  y={yReceita}
                  width={larguraBarra}
                  height={Math.max(2, alturaReceita)}
                  rx={4}
                  fill="var(--color-success)"
                  opacity={estaHovered ? 1 : 0.85}
                  className="transition-all duration-200 hover:brightness-110"
                />

                {/* Barra Despesa */}
                <rect
                  x={xDespesa}
                  y={yDespesa}
                  width={larguraBarra}
                  height={Math.max(2, alturaDespesa)}
                  rx={4}
                  fill="var(--color-danger)"
                  opacity={estaHovered ? 1 : 0.85}
                  className="transition-all duration-200 hover:brightness-110"
                />

                {/* Rótulo do Mês no Eixo X */}
                <text
                  x={centroGrupoX}
                  y={SVG_HEIGHT - 8}
                  textAnchor="middle"
                  className={`text-[10px] font-semibold ${estaHovered ? 'fill-primary font-bold' : 'fill-on-surface-variant/80'}`}
                >
                  {formatarNomeMes(ponto.mes)}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Card de Tooltip Flutuante para Mês Ativo */}
        {pontoAtivo && mesHover !== null && (
          <div
            className="absolute z-30 pointer-events-none rounded-xl bg-background/95 backdrop-blur-md p-2.5 px-3.5 border border-outline-variant/60 shadow-2xl transition-all duration-150"
            style={{
              left: `${Math.min(85, Math.max(15, ((PADDING_LEFT + mesHover * (chartWidth / porMes.length) + (chartWidth / porMes.length) / 2) / SVG_WIDTH) * 100))}%`,
              top: '15%',
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface border-b border-outline-variant/30 pb-1 mb-1.5">
              <span>📅</span>
              <span>{formatarNomeMes(pontoAtivo.mes)}</span>
            </div>
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--color-success)] font-medium">Receita:</span>
                <span className="font-bold text-on-surface">{formatarMoeda(pontoAtivo.receita)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--color-danger)] font-medium">Despesa:</span>
                <span className="font-bold text-on-surface">{formatarMoeda(pontoAtivo.despesa)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-outline-variant/20 font-extrabold text-primary">
                <span>Resultado:</span>
                <span>{formatarMoeda(pontoAtivo.receita - pontoAtivo.despesa)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
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

      <Card className="bg-surface p-4 rounded-2xl border border-outline-variant/40">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-on-surface-variant">
            Início
            <input
              type="month"
              value={mesInicio}
              onChange={(evento) => setMesInicio(evento.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-container px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-on-surface-variant">
            Fim
            <input
              type="month"
              value={mesFim}
              onChange={(evento) => setMesFim(evento.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-container px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
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
        <p className="text-sm text-on-surface-variant animate-pulse">Carregando dados financeiros...</p>
      ) : resumo.porMes.length === 0 ? (
        <EmptyState titulo="Nenhuma transação no período" descricao="Ajuste o intervalo de meses acima para ver os dados." />
      ) : (
        <>
          {/* CARDS DE KPI INSPIRADOS NO DASHBOARD DE REFERÊNCIA */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="glow-hover bg-surface p-4 rounded-2xl border border-outline-variant/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-on-surface-variant">Receita Total</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  ↑ Entradas
                </span>
              </div>
              <p className="text-headline-sm font-extrabold text-primary">{formatarMoeda(resumo.receitaTotal)}</p>
            </Card>

            <Card className="glow-hover bg-surface p-4 rounded-2xl border border-outline-variant/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-on-surface-variant">Despesa Total</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                  ↓ Saídas
                </span>
              </div>
              <p className="text-headline-sm font-extrabold text-primary">{formatarMoeda(resumo.despesaTotal)}</p>
            </Card>

            <Card className="glow-hover bg-surface p-4 rounded-2xl border border-outline-variant/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-on-surface-variant">Resultado Líquido</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  ✦ Saldo
                </span>
              </div>
              <p className="text-headline-sm font-extrabold text-primary">{formatarMoeda(resumo.resultado)}</p>
            </Card>

            <Card className="glow-hover bg-surface p-4 rounded-2xl border border-outline-variant/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-on-surface-variant">Margem Média</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                  📊 Eficiência
                </span>
              </div>
              <p className="text-headline-sm font-extrabold text-primary">{formatarPorcentagem(resumo.margem)}</p>
            </Card>
          </div>

          {/* GRÁFICO PRINCIPAL DE COMPARATIVO DE MÊS A MÊS */}
          <Card className="bg-surface p-5 rounded-2xl border border-outline-variant/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-on-surface tracking-tight">Receita x Despesa por Mês</h2>
                <p className="text-xs text-on-surface-variant">Comparativo mensal de entradas e saídas do período selecionado</p>
              </div>
            </div>
            <GraficoBarras porMes={resumo.porMes} />
          </Card>

          {/* PAINÉIS ADICIONAIS ESTILO DE RETENÇÃO E ALOCAÇÃO POR CATEGORIA (REFERÊNCIA DA IMAGEM) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PAINEL DE BARRAS HORIZONTAIS DE RETENÇÃO/MARGEM POR MÊS */}
            <Card className="bg-surface p-5 rounded-2xl border border-outline-variant/40 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface tracking-tight mb-1">Performance de Margem por Mês</h3>
                <p className="text-xs text-on-surface-variant mb-4">Percentual de lucro retido por período</p>

                <div className="flex flex-col gap-3">
                  {resumo.porMes.slice(-5).map((ponto) => {
                    const margemMes = ponto.receita > 0 ? ((ponto.receita - ponto.despesa) / ponto.receita) * 100 : 0
                    const percLargura = Math.min(100, Math.max(8, margemMes))

                    return (
                      <div key={ponto.mes} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-on-surface-variant w-16 shrink-0">{formatarNomeMes(ponto.mes)}</span>
                        <div className="flex-1 h-6 rounded-lg bg-surface-container-high/40 overflow-hidden relative border border-outline-variant/20">
                          <div
                            className="h-full rounded-lg bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${percLargura}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-primary w-12 text-right">{margemMes.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* PAINEL DE ALOCAÇÃO ESTIMADA DE INSUMOS & DESPESAS */}
            <Card className="bg-surface p-5 rounded-2xl border border-outline-variant/40 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface tracking-tight mb-1">Alocação por Tipo de Custo</h3>
                <p className="text-xs text-on-surface-variant mb-4">Distribuição estimada de gastos do ateliê</p>

                <div className="flex flex-col gap-3">
                  {[
                    { nome: 'Resina Epóxi & Endurecedor', pct: 45, icone: '🧪' },
                    { nome: 'Moldes de Silicone', pct: 25, icone: '🧊' },
                    { nome: 'Pigmentos & Glitter', pct: 15, icone: '✨' },
                    { nome: 'Embalagens & Envio', pct: 10, icone: '📦' },
                    { nome: 'Outros Consumíveis', pct: 5, icone: '🛠️' },
                  ].map((item) => (
                    <div key={item.nome} className="flex items-center gap-3">
                      <span className="text-xs shrink-0">{item.icone}</span>
                      <span className="text-xs font-medium text-on-surface-variant flex-1 truncate">{item.nome}</span>
                      <div className="w-28 sm:w-36 h-2 rounded-full bg-surface-container-high/60 overflow-hidden border border-outline-variant/20">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-on-surface w-8 text-right">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
