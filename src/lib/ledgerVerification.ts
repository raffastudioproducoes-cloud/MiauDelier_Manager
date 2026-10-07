import { db } from '../db/schema'

export async function calcularMovimentoDoLedger(contaId: number): Promise<number> {
  const transacoes = await db.transacoes.where('contaId').equals(contaId).toArray()

  return transacoes.reduce((total, transacao) => {
    const valor = Number(transacao.valorCriptografado)
    if (!Number.isFinite(valor)) return total
    return total + (transacao.tipo === 'entrada' ? valor : -valor)
  }, 0)
}
