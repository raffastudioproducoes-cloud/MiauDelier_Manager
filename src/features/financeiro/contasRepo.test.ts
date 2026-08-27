import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta, listarContas, atualizarSaldoConta } from './contasRepo'

describe('repositório de contas', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('cria e lista uma conta com o saldo decifrado corretamente', async () => {
    await criarConta({ nome: 'Caixa do ateliê', saldoInicial: 500 })

    const contas = await listarContas()
    expect(contas).toHaveLength(1)
    expect(contas[0].nome).toBe('Caixa do ateliê')
    expect(contas[0].saldo).toBe(500)
  })

  it('não guarda o saldo em claro no registro bruto do banco', async () => {
    await criarConta({ nome: 'Caixa', saldoInicial: 777.5 })

    const bruto = await db.contas.toArray()
    expect(bruto[0].saldoCriptografado).not.toContain('777.5')
  })

  it('atualiza o saldo de uma conta', async () => {
    const id = await criarConta({ nome: 'Caixa', saldoInicial: 100 })
    await atualizarSaldoConta(id, 250)

    const contas = await listarContas()
    expect(contas[0].saldo).toBe(250)
  })
})
