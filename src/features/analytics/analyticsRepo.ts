import { listarTodasTransacoes } from '../financeiro/transacoesRepo'
import { db, type HistoricoPrecoMaterial } from '../../db/schema'

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
  descontoTotal: number
  comprasComDesconto: HistoricoPrecoMaterial[]
  historicoPrecos: HistoricoPrecoMaterial[]
  historicoExpiraEm30Dias: number
  historicoVencido: number
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
  const [transacoes, todoHistorico] = await Promise.all([
    listarTodasTransacoes(),
    db.historicoPrecosMateriais.orderBy('dataCompra').reverse().toArray(),
  ])

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
  const historicoPrecos = todoHistorico.filter((compra) => {
    const mes = mesLocal(compra.dataCompra)
    return mes >= mesInicio && mes <= mesFim
  })
  const comprasComDesconto = historicoPrecos.filter((compra) => compra.valorDesconto > 0)
  const agora = Date.now()
  const umAno = 365 * 24 * 60 * 60 * 1000
  const avisoEm = 30 * 24 * 60 * 60 * 1000
  const idades = todoHistorico.map((compra) => agora - new Date(compra.dataCompra).getTime())
  const historicoVencido = idades.filter((idade) => idade > umAno).length
  const historicoExpiraEm30Dias = idades.filter((idade) => idade >= umAno - avisoEm && idade <= umAno).length

  return {
    porMes,
    receitaTotal,
    despesaTotal,
    resultado,
    margem,
    descontoTotal: comprasComDesconto.reduce((soma, compra) => soma + compra.valorDesconto, 0),
    comprasComDesconto,
    historicoPrecos,
    historicoExpiraEm30Dias,
    historicoVencido,
  }
}
