import { listarTodasTransacoes } from '../financeiro/transacoesRepo'

export interface PontoAnalyticsMes {
  mes: string
  receita: number
  despesa: number
}

export interface ResumoAnalytics {
  porMes: PontoAnalyticsMes[]
  receitaTotal: number
  despesaTotal: number
  resultado: number
  margem: number
}

// ponytail: mesma regra de dashboardRepo.ts — string "YYYY-MM-DD"/"YYYY-MM"
// (vinda de <input>) já é a data-calendário pretendida, não passa por new Date()
function mesLocal(valor: string): string {
  if (/^\d{4}-\d{2}/.test(valor)) {
    return valor.slice(0, 7)
  }
  const data = new Date(valor)
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export async function obterResumoAnalytics(mesInicio: string, mesFim: string): Promise<ResumoAnalytics> {
  const transacoes = await listarTodasTransacoes()

  const mesesNoIntervalo = transacoes
    .map((transacao) => mesLocal(transacao.data))
    .filter((mes) => mes >= mesInicio && mes <= mesFim)
  const mesesOrdenados = Array.from(new Set(mesesNoIntervalo)).sort()

  const porMes: PontoAnalyticsMes[] = mesesOrdenados.map((mes) => {
    const transacoesDoMes = transacoes.filter((transacao) => mesLocal(transacao.data) === mes)
    return {
      mes,
      receita: transacoesDoMes.filter((t) => t.tipo === 'entrada').reduce((soma, t) => soma + t.valor, 0),
      despesa: transacoesDoMes.filter((t) => t.tipo === 'saida').reduce((soma, t) => soma + t.valor, 0),
    }
  })

  const receitaTotal = porMes.reduce((soma, ponto) => soma + ponto.receita, 0)
  const despesaTotal = porMes.reduce((soma, ponto) => soma + ponto.despesa, 0)
  const resultado = receitaTotal - despesaTotal
  const margem = receitaTotal === 0 ? 0 : resultado / receitaTotal

  return { porMes, receitaTotal, despesaTotal, resultado, margem }
}
