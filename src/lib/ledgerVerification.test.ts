import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { calcularMovimentoDoLedger } from './ledgerVerification'

describe('ledger verification', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('calcula somente o movimento e nunca altera o saldo inicial da conta', async () => {
    const contaId = await db.contas.add({ nome: 'Nubank', saldoCriptografado: '551.63' })
    if (contaId === undefined) throw new Error('Conta não criada')
    await db.transacoes.add({ contaId, tipo: 'saida', valorCriptografado: '38.16', descricao: 'Compra', data: '2026-10-07' })

    expect(await calcularMovimentoDoLedger(contaId)).toBe(-38.16)
    expect((await db.contas.get(contaId))?.saldoCriptografado).toBe('551.63')
    expect(await db.auditoria.count()).toBe(0)
  })
})
