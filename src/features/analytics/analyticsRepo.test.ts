import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta } from '../financeiro/contasRepo'
import { criarTransacao } from '../financeiro/transacoesRepo'
import { obterResumoAnalytics } from './analyticsRepo'

describe('resumo de analytics', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('agrega receita e despesa por mês dentro do período', async () => {
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    await criarTransacao({ contaId, tipo: 'entrada', valor: 100, descricao: 'Venda', data: '2026-06-15' })
    await criarTransacao({ contaId, tipo: 'saida', valor: 30, descricao: 'Material', data: '2026-06-20' })
    await criarTransacao({ contaId, tipo: 'entrada', valor: 200, descricao: 'Venda', data: '2026-07-05' })

    const resumo = await obterResumoAnalytics('2026-06', '2026-07')

    expect(resumo.porMes).toEqual([
      { mes: '2026-06', receita: 100, despesa: 30 },
      { mes: '2026-07', receita: 200, despesa: 0 },
    ])
    expect(resumo.receitaTotal).toBe(300)
    expect(resumo.despesaTotal).toBe(30)
    expect(resumo.resultado).toBe(270)
    expect(resumo.margem).toBeCloseTo(0.9)
  })

  it('retorna zeros quando não há transações no período', async () => {
    const resumo = await obterResumoAnalytics('2026-01', '2026-02')
    expect(resumo.receitaTotal).toBe(0)
    expect(resumo.margem).toBe(0)
  })

  it('agrega descontos e expõe o histórico de preço no período', async () => {
    await db.historicoPrecosMateriais.bulkAdd([
      { materialId: 1, nomeMaterial: 'Resina', unidade: 'kg', quantidadeComprada: 2, valorProdutos: 200, valorFrete: 20, valorDesconto: 30, valorTotalPago: 190, custoUnitario: 95, dataCompra: '2026-06-10T00:00:00.000Z', registradoEm: '2026-06-10T00:00:00.000Z' },
      { materialId: 1, nomeMaterial: 'Resina', unidade: 'kg', quantidadeComprada: 1, valorProdutos: 120, valorFrete: 0, valorDesconto: 0, valorTotalPago: 120, custoUnitario: 120, dataCompra: '2026-07-10T00:00:00.000Z', registradoEm: '2026-07-10T00:00:00.000Z' },
    ])

    const resumo = await obterResumoAnalytics('2026-06', '2026-07')

    expect(resumo.descontoTotal).toBe(30)
    expect(resumo.comprasComDesconto).toHaveLength(1)
    expect(resumo.historicoPrecos).toHaveLength(2)
    expect(resumo.historicoPrecos[0]).toMatchObject({ nomeMaterial: 'Resina', custoUnitario: 120 })
  })
})
