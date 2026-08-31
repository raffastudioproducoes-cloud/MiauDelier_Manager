interface PontoFluxoCaixa {
  data: string
  entradas: number
  saidas: number
}

const ALTURA_SVG = 120
const LARGURA_BARRA = 16
const ESPACO_ENTRE_BARRAS = 8

export function FluxoCaixaChart({ dados }: { dados: PontoFluxoCaixa[] }) {
  const maiorValor = Math.max(1, ...dados.flatMap((ponto) => [ponto.entradas, ponto.saidas]))
  const largura = dados.length * (LARGURA_BARRA * 2 + ESPACO_ENTRE_BARRAS)

  return (
    <div>
      <p className="text-sm font-medium text-on-surface mb-2">Fluxo de caixa — últimos 14 dias</p>
      <svg width="100%" viewBox={`0 0 ${largura} ${ALTURA_SVG}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Gráfico de entradas e saídas dos últimos 14 dias">
        {dados.map((ponto, indice) => {
          const x = indice * (LARGURA_BARRA * 2 + ESPACO_ENTRE_BARRAS)
          const alturaEntrada = (ponto.entradas / maiorValor) * (ALTURA_SVG - 10)
          const alturaSaida = (ponto.saidas / maiorValor) * (ALTURA_SVG - 10)
          return (
            <g key={ponto.data}>
              <rect x={x} y={ALTURA_SVG - alturaEntrada} width={LARGURA_BARRA} height={alturaEntrada} rx={2} fill="var(--color-success)" opacity={0.85} />
              <rect x={x + LARGURA_BARRA} y={ALTURA_SVG - alturaSaida} width={LARGURA_BARRA} height={alturaSaida} rx={2} fill="var(--color-danger)" opacity={0.85} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
