import { listarContas } from '../financeiro/contasRepo'
import { listarTodasTransacoes } from '../financeiro/transacoesRepo'

export type SeveridadeInconsistencia = 'baixa' | 'media' | 'alta' | 'critica'

export interface InconsistenciaFinanceira {
  titulo: string
  descricao: string
  severidade: SeveridadeInconsistencia
}

export interface DiagnosticoFinanceiro {
  saldoInicialTotal: number
  entradasTotais: number
  saidasTotais: number
  saldoConciliado: number
  saldoAtualContas: number
  divergencia: number
  scoreSaude: number // 0 a 100
  inconsistencias: InconsistenciaFinanceira[]
  geradoEm: string
}

export async function gerarDiagnosticoFinanceiro(): Promise<DiagnosticoFinanceiro> {
  const contas = await listarContas()
  const transacoes = await listarTodasTransacoes()

  let entradasTotais = 0
  let saidasTotais = 0

  for (const t of transacoes) {
    if (t.tipo === 'entrada') {
      entradasTotais += t.valor
    } else if (t.tipo === 'saida') {
      saidasTotais += t.valor
    }
  }

  const saldoAtualContas = contas.reduce((acc, c) => acc + c.saldo, 0)
  const saldoConciliado = entradasTotais - saidasTotais
  const divergencia = Math.abs(saldoAtualContas - saldoConciliado)

  const inconsistencias: InconsistenciaFinanceira[] = []

  if (contas.length === 0) {
    inconsistencias.push({
      titulo: 'Nenhuma conta cadastrada',
      descricao: 'Não há contas financeiras cadastradas no ateliê para acompanhamento de caixa.',
      severidade: 'critica',
    })
  }

  if (saldoAtualContas < 0) {
    inconsistencias.push({
      titulo: 'Caixa Geral Negativo',
      descricao: 'O saldo total acumulado das contas está negativo, indicando saídas superiores às entradas.',
      severidade: 'critica',
    })
  }

  if (transacoes.length === 0 && contas.length > 0) {
    inconsistencias.push({
      titulo: 'Sem transações registradas',
      descricao: 'Nenhuma movimentação de entrada ou saída foi registrada ainda.',
      severidade: 'media',
    })
  }

  if (saidasTotais > entradasTotais && transacoes.length > 0) {
    inconsistencias.push({
      titulo: 'Despesa Superior à Receita',
      descricao: 'As saídas totais superam as entradas registradas no ateliê.',
      severidade: 'alta',
    })
  }

  let pontosDesconto = 0
  for (const inc of inconsistencias) {
    if (inc.severidade === 'critica') pontosDesconto += 35
    else if (inc.severidade === 'alta') pontosDesconto += 20
    else if (inc.severidade === 'media') pontosDesconto += 10
    else if (inc.severidade === 'baixa') pontosDesconto += 5
  }

  const scoreSaude = Math.max(0, Math.min(100, 100 - pontosDesconto))

  return {
    saldoInicialTotal: 0,
    entradasTotais,
    saidasTotais,
    saldoConciliado,
    saldoAtualContas,
    divergencia,
    scoreSaude,
    inconsistencias,
    geradoEm: new Date().toISOString(),
  }
}
