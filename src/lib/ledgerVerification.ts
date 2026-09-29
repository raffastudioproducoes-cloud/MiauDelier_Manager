import { db } from '../db/schema'
import { getSessionKey } from './auth'
import { encryptText, decryptText } from './crypto'

export async function verificarIntegridadeDoLedger(): Promise<void> {
  const key = getSessionKey()
  if (!key) return

  // 1. Pega todas as contas
  const contas = await db.contas.toArray()

  for (const conta of contas) {
    let saldoCalculado = 0

    // 2. Pega todas as transações dessa conta
    const transacoes = await db.transacoes.where('contaId').equals(conta.id!).toArray()

    // 3. Recalcula o saldo a partir do Livro-Razão (Ledger)
    for (const tx of transacoes) {
      try {
        const valorStr = await decryptText(key, tx.valorCriptografado)
        const valor = parseFloat(valorStr)
        if (!isNaN(valor)) {
          if (tx.tipo === 'entrada') {
            saldoCalculado += valor
          } else if (tx.tipo === 'saida') {
            saldoCalculado -= valor
          }
        }
      } catch (err) {
        console.warn(`Transação inválida/corrompida ignorada (ID: ${tx.id})`, err)
      }
    }

    // 4. Compara com o saldo atual armazenado na conta
    let saldoAtual: number
    try {
      const saldoStr = await decryptText(key, conta.saldoCriptografado)
      saldoAtual = parseFloat(saldoStr) || 0
    } catch {
      // Se não conseguiu descriptografar, assume 0 e vai forçar a correção
      saldoAtual = NaN
    }

    // Usamos toFixed(2) para evitar problemas de ponto flutuante
    if (saldoCalculado.toFixed(2) !== saldoAtual.toFixed(2) || isNaN(saldoAtual)) {
      console.warn(
        `Inconsistência detectada na conta "${conta.nome}". Saldo registrado: ${saldoAtual}, Saldo real (Transações): ${saldoCalculado}. Corrigindo...`,
      )

      // Corrige a conta para refletir a verdade do Ledger
      const novoSaldoCriptografado = await encryptText(key, saldoCalculado.toFixed(2))
      await db.contas.update(conta.id!, { saldoCriptografado: novoSaldoCriptografado })

      // Registra a auditoria
      await db.auditoria.add({
        entidade: 'contas',
        entidadeId: conta.id!,
        quem: 'Sistema de Sincronização (Ledger)',
        quando: new Date().toISOString(),
        acao: 'alteracao_preco', // Usando um tipo genérico para correções
        valorAnterior: String(saldoAtual),
        valorNovo: String(saldoCalculado),
      })
    }
  }
}
