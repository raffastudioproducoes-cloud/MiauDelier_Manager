import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount, login, clearSession } from '../../lib/auth'
import { criarConta } from './contasRepo'
import { criarTransacao } from './transacoesRepo'

describe('critério de aceite da Fase 2: banco cru não expõe dado sensível', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('nenhum valor em claro aparece no IndexedDB, e a senha certa reabre os dados', async () => {
    await setupAccount('senha-secreta-do-ateliê')
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 9999.99 })
    await criarTransacao({
      contaId,
      tipo: 'entrada',
      valor: 1234.5,
      descricao: 'Venda de peça grande',
      data: '2026-08-26',
    })

    const contasCruas = await db.contas.toArray()
    const transacoesCruas = await db.transacoes.toArray()
    const dump = JSON.stringify({ contasCruas, transacoesCruas })

    expect(dump).not.toContain('9999.99')
    expect(dump).not.toContain('1234.5')
    expect(dump).not.toContain('senha-secreta-do-ateliê')

    clearSession()
    const chave = await login('senha-secreta-do-ateliê')
    expect(chave).not.toBeNull()
  })
})
