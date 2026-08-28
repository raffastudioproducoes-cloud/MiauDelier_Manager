import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarTransacao, listarTransacoesDaConta, listarTodasTransacoes } from './transacoesRepo'

describe('repositório de transações', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('cria e lista uma transação com o valor decifrado corretamente', async () => {
    const id = await criarTransacao({
      contaId: 1,
      tipo: 'entrada',
      valor: 150.75,
      descricao: 'Venda de chaveiro',
      data: '2026-08-26',
    })
    expect(id).toBeGreaterThan(0)

    const transacoes = await listarTransacoesDaConta(1)
    expect(transacoes).toHaveLength(1)
    expect(transacoes[0].valor).toBe(150.75)
    expect(transacoes[0].descricao).toBe('Venda de chaveiro')
  })

  it('não guarda o valor em claro no registro bruto do banco', async () => {
    await criarTransacao({ contaId: 1, tipo: 'saida', valor: 42.9, descricao: 'Resina', data: '2026-08-26' })

    const bruto = await db.transacoes.toArray()
    expect(bruto).toHaveLength(1)
    expect(bruto[0].valorCriptografado).not.toContain('42.9')
    expect(bruto[0].valorCriptografado).toContain(':')
  })

  it('lista só as transações da conta pedida', async () => {
    await criarTransacao({ contaId: 1, tipo: 'entrada', valor: 10, descricao: 'A', data: '2026-08-26' })
    await criarTransacao({ contaId: 2, tipo: 'entrada', valor: 20, descricao: 'B', data: '2026-08-26' })

    const daConta1 = await listarTransacoesDaConta(1)
    expect(daConta1).toHaveLength(1)
    expect(daConta1[0].descricao).toBe('A')
  })

  it('lista transações de todas as contas juntas', async () => {
    await criarTransacao({ contaId: 1, tipo: 'entrada', valor: 100, descricao: 'A', data: '2026-08-01' })
    await criarTransacao({ contaId: 2, tipo: 'saida', valor: 30, descricao: 'B', data: '2026-08-02' })

    const todas = await listarTodasTransacoes()
    expect(todas).toHaveLength(2)
    expect(todas.map((t) => t.descricao).sort()).toEqual(['A', 'B'])
  })
})
