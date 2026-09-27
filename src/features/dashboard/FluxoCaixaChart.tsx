import { useState } from 'react'

export interface PontoFluxoCaixa {
  data: string
  entradas: number
  saidas: number
}

function formatarDataCurta(dataStr: string): string {
  try {
    const [ano, mes, dia] = dataStr.split('-').map(Number)
    if (!mes || !dia) return dataStr
    const dataObj = new Date(ano, mes - 1, dia)
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${dia} ${meses[dataObj.getMonth()]}`
  } catch {
    return dataStr
  }
}

function formatarMoeda(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function getCurvedPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return path
}

export function FluxoCaixaChart({ dados }: { dados: PontoFluxoCaixa[] }) {
  const [periodoFiltro, setPeriodoFiltro] = useState<'7D' | '14D' | '30D'>('14D')
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null)

  // Filtragem pelo período selecionado
  const dadosFiltrados =
    periodoFiltro === '7D'
      ? dados.slice(-7)
      : dados

  const SVG_WIDTH = 750
  const SVG_HEIGHT = 200
  const PADDING_LEFT = 55
  const PADDING_RIGHT = 25
  const PADDING_TOP = 20
  const PADDING_BOTTOM = 30

  const chartWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const chartHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM

  // Cálculos de máximos e mínimos para a curva de fluxo líquido acumulado / entradas
  const valoresLiquidos = dadosFiltrados.map((d) => d.entradas - d.saidas)
  const maxValorLiquido = Math.max(100, ...dadosFiltrados.map((d) => Math.max(d.entradas, d.saidas, d.entradas - d.saidas)))
  const minValorLiquido = Math.min(0, ...valoresLiquidos)

  const range = maxValorLiquido - minValorLiquido || 1

  const pontos = dadosFiltrados.map((d, i) => {
    const x = PADDING_LEFT + (i / Math.max(1, dadosFiltrados.length - 1)) * chartWidth
    const val = d.entradas - d.saidas
    const y = PADDING_TOP + chartHeight - ((val - minValorLiquido) / range) * chartHeight
    return { x, y, data: d }
  })

  const pathLine = getCurvedPath(pontos)
  const pathArea =
    pontos.length > 0
      ? `${pathLine} L ${pontos[pontos.length - 1].x.toFixed(1)} ${(PADDING_TOP + chartHeight).toFixed(1)} L ${pontos[0].x.toFixed(1)} ${(PADDING_TOP + chartHeight).toFixed(1)} Z`
      : ''

  // Ponto ativo para exibição do Tooltip (padrão é o último elemento)
  const pontoAtivo = indiceAtivo !== null && pontos[indiceAtivo] ? pontos[indiceAtivo] : pontos[pontos.length - 1]

  // Linhas de Grade Verticais (Eixo Y)
  const gridSteps = 4
  const gridYValues = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = minValorLiquido + (range / gridSteps) * (gridSteps - i)
    const y = PADDING_TOP + (chartHeight / gridSteps) * i
    return { val, y }
  })

  return (
    <div className="flex flex-col gap-3 w-full h-full justify-between">
      {/* Cabeçalho do Gráfico com Filtros */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-on-surface tracking-tight">Fluxo de caixa</h3>
          <span className="text-xs text-on-surface-variant/80 font-medium cursor-help" title="Evolução do saldo de entradas e saídas do ateliê">
            ⓘ
          </span>
        </div>

        {/* Botoes de Filtro 7D / 14D / 30D */}
        <div className="flex items-center rounded-lg bg-surface-container-high/40 p-0.5 border border-outline-variant/30 text-[11px] font-bold">
          {(['7D', '14D', '30D'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriodoFiltro(p)
                setIndiceAtivo(null)
              }}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                periodoFiltro === p
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG do Gráfico Estilo High-Tech Curve ajustado à caixa */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-surface-container-lowest/30 p-2 border border-outline-variant/20 shadow-inner min-h-[220px]">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico de fluxo de caixa dos últimos dias"
          className="overflow-visible w-full h-full"
        >
          <defs>
            {/* Gradiente Brilhante da Área Abaixo da Curva */}
            <linearGradient id="fluxoGradientArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #E89D75)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="var(--color-primary, #E89D75)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-primary, #E89D75)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade de Fundo */}
          {gridYValues.map(({ val, y }, idx) => (
            <g key={idx}>
              <rect x={PADDING_LEFT} y={y - 0.5} width={chartWidth} height={1} fill="var(--color-outline-variant)" opacity={0.12} />
              <text x={PADDING_LEFT - 8} y={y + 3.5} textAnchor="end" className="text-[10px] font-semibold fill-on-surface-variant/70">
                {formatarMoeda(val)}
              </text>
            </g>
          ))}

          {/* Eixo X - Rótulos de Datas */}
          {pontos.map((p, idx) => {
            const ehUltimo = idx === pontos.length - 1
            const deQuantoEmQuanto = Math.max(1, Math.floor(pontos.length / 6))
            const deveMostrar = idx % deQuantoEmQuanto === 0 || ehUltimo

            return (
              <g key={p.data.data} onMouseEnter={() => setIndiceAtivo(idx)} className="cursor-pointer">
                {/* Área de Hover em cada ponto */}
                <rect
                  x={p.x - chartWidth / (pontos.length * 2)}
                  y={PADDING_TOP}
                  width={chartWidth / pontos.length}
                  height={chartHeight}
                  fill="transparent"
                />
                {deveMostrar && (
                  <text x={p.x} y={SVG_HEIGHT - 6} textAnchor="middle" className="text-[10px] font-medium fill-on-surface-variant/80">
                    {formatarDataCurta(p.data.data)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Preenchimento de Área sob a Curva */}
          {pathArea && <path d={pathArea} fill="url(#fluxoGradientArea)" />}

          {/* Linha Curva sem filtros com vazamento de sombra */}
          {pathLine && (
            <path
              d={pathLine}
              fill="none"
              stroke="var(--color-primary, #E89D75)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Ponto Ativo Selecionado e Linha Indicadora Vertical Limpa (Sem artefato de sombra bugada) */}
          {pontoAtivo && (
            <g>
              {/* Linha Vertical pontilhada */}
              <line
                x1={pontoAtivo.x}
                y1={PADDING_TOP}
                x2={pontoAtivo.x}
                y2={PADDING_TOP + chartHeight}
                stroke="var(--color-primary, #E89D75)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.5"
              />

              {/* Halo Suave sem Animação Ping Bugada */}
              <circle
                cx={pontoAtivo.x}
                cy={pontoAtivo.y}
                r="8"
                fill="var(--color-primary, #E89D75)"
                opacity="0.3"
              />

              {/* Círculo do Ponto no Gráfico */}
              <circle
                cx={pontoAtivo.x}
                cy={pontoAtivo.y}
                r="5"
                fill="var(--color-primary, #E89D75)"
                stroke="var(--color-background, #14171A)"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Card de Tooltip Flutuante Compacto */}
        {pontoAtivo && (
          <div
            className="absolute z-30 pointer-events-none rounded-xl bg-background/95 backdrop-blur-md p-2 px-3 border border-outline-variant/60 shadow-2xl transition-all duration-150"
            style={{
              left: `${Math.min(80, Math.max(20, (pontoAtivo.x / SVG_WIDTH) * 100))}%`,
              top: `${Math.max(12, Math.min(50, (pontoAtivo.y / SVG_HEIGHT) * 100 - 20))}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant">
              <span>📅</span>
              <span>{formatarDataCurta(pontoAtivo.data.data)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs font-extrabold text-primary">
                {(pontoAtivo.data.entradas - pontoAtivo.data.saidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2.5 text-[9px] text-on-surface-variant/90 border-t border-outline-variant/30 pt-1">
              <span className="text-[var(--color-success)] font-medium">↑ +{formatarMoeda(pontoAtivo.data.entradas)}</span>
              <span className="text-[var(--color-danger)] font-medium">↓ -{formatarMoeda(pontoAtivo.data.saidas)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
