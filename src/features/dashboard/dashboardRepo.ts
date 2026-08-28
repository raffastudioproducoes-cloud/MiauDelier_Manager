import { listarContas } from '../financeiro/contasRepo'
import { listarTodasTransacoes } from '../financeiro/transacoesRepo'
import { listarMateriais } from '../producao/materiaisRepo'
import { listarPecas, listarEventosDaPeca } from '../producao/pecasRepo'
import { listarPedidos } from '../vendas/pedidosRepo'

// ponytail: limiar de estoque baixo é fixo (não é campo configurável no schema); subir para preferência por material se o ateliê pedir granularidade
const LIMIAR_ESTOQUE_BAIXO = 10
const DIAS_FLUXO_CAIXA = 14
const MAX_EVENTOS_RECENTES = 8

export interface ResumoDashboard {
  saldoTotal: number
  lucroDoMes: number
  pecasEmProducao: number
  pecasEmCura: number
  materiaisEstoqueBaixo: number
  pedidosAbertos: number
  fluxoCaixa14Dias: Array<{ data: string; entradas: number; saidas: number }>
  eventosRecentes: Array<{ pecaId: number; nomePeca: string; tipo: string; descricao: string; criadoEm: string }>
}

function inicioDoDia(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export async function obterResumoDashboard(): Promise<ResumoDashboard> {
  const [contas, transacoes, materiais, pecas, pedidos] = await Promise.all([
    listarContas(),
    listarTodasTransacoes(),
    listarMateriais(),
    listarPecas(),
    listarPedidos(),
  ])

  const saldoTotal = contas.reduce((soma, conta) => soma + conta.saldo, 0)

  const agora = new Date()
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const chaveInicioDoMes = inicioDoDia(inicioDoMes)
  const lucroDoMes = transacoes
    .filter((transacao) => inicioDoDia(new Date(transacao.data)) >= chaveInicioDoMes)
    .reduce((soma, transacao) => soma + (transacao.tipo === 'entrada' ? transacao.valor : -transacao.valor), 0)

  const pecasEmProducao = pecas.filter((peca) => peca.status === 'em_producao').length
  const pecasEmCura = pecas.filter((peca) => peca.status === 'curando').length
  const materiaisEstoqueBaixo = materiais.filter((material) => material.quantidadeEstoque < LIMIAR_ESTOQUE_BAIXO).length
  const pedidosAbertos = pedidos.filter((pedido) => pedido.status === 'aberto').length

  const fluxoCaixa14Dias: ResumoDashboard['fluxoCaixa14Dias'] = []
  for (let i = DIAS_FLUXO_CAIXA - 1; i >= 0; i--) {
    const dia = new Date(agora)
    dia.setDate(dia.getDate() - i)
    const chaveDia = inicioDoDia(dia)
    const transacoesDoDia = transacoes.filter((transacao) => inicioDoDia(new Date(transacao.data)) === chaveDia)
    fluxoCaixa14Dias.push({
      data: chaveDia,
      entradas: transacoesDoDia.filter((t) => t.tipo === 'entrada').reduce((soma, t) => soma + t.valor, 0),
      saidas: transacoesDoDia.filter((t) => t.tipo === 'saida').reduce((soma, t) => soma + t.valor, 0),
    })
  }

  const eventosPorPeca = await Promise.all(
    pecas.map(async (peca) => {
      const eventos = await listarEventosDaPeca(peca.id!)
      return eventos.map((evento) => ({
        pecaId: peca.id!,
        nomePeca: peca.nome,
        tipo: evento.tipo,
        descricao: evento.descricao,
        criadoEm: evento.criadoEm,
      }))
    }),
  )
  const eventosRecentes = eventosPorPeca
    .flat()
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    .slice(0, MAX_EVENTOS_RECENTES)

  return { saldoTotal, lucroDoMes, pecasEmProducao, pecasEmCura, materiaisEstoqueBaixo, pedidosAbertos, fluxoCaixa14Dias, eventosRecentes }
}
