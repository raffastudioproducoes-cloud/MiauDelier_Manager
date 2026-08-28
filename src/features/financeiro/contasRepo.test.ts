import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta, listarContas, atualizarSaldoConta } from './contasRepo'
import { criarTransacao } from './transacoesRepo'

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

  it('deriva o saldo somando entradas e subtraindo saídas da conta', async () => {
    const id = await criarConta({ nome: 'Caixa', saldoInicial: 500 })
    await criarTransacao({ contaId: id, tipo: 'entrada', valor: 150, descricao: 'Venda', data: '2026-08-27' })
    await criarTransacao({ contaId: id, tipo: 'saida', valor: 40, descricao: 'Resina', data: '2026-08-27' })

    const contas = await listarContas()
    expect(contas[0].saldo).toBe(610)
  })

  it('atualiza o saldo de uma conta', async () => {
    const id = await criarConta({ nome: 'Caixa', saldoInicial: 100 })
    await atualizarSaldoConta(id, 250)

    const contas = await listarContas()
    expect(contas[0].saldo).toBe(250)
  })
})
