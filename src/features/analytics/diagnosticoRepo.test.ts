import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta } from '../financeiro/contasRepo'
import { criarTransacao } from '../financeiro/transacoesRepo'
import { gerarDiagnosticoFinanceiro } from './diagnosticoRepo'

describe('serviço de diagnóstico financeiro', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('gera diagnóstico zerado sem contas', async () => {
    await db.contas.clear()
    const diag = await gerarDiagnosticoFinanceiro()

    expect(diag.scoreSaude).toBeLessThan(100)
    expect(diag.inconsistencias.some((i) => i.severidade === 'critica')).toBe(true)
  })

  it('calcula entradas, saídas e score de saúde positivo', async () => {
    const contaId = await criarConta({ nome: 'Caixa Principal', saldoInicial: 500 })

    await criarTransacao({
      contaId,
      tipo: 'entrada',
      valor: 200,
      descricao: 'Venda de peça resina',
      data: '2026-09-01',
    })

    await criarTransacao({
      contaId,
      tipo: 'saida',
      valor: 50,
      descricao: 'Compra de pigmentos',
      data: '2026-09-02',
    })

    const diag = await gerarDiagnosticoFinanceiro()

    expect(diag.entradasTotais).toBe(200)
    expect(diag.saidasTotais).toBe(50)
    expect(diag.saldoAtualContas).toBe(650) // 500 + 200 - 50
    expect(diag.scoreSaude).toBe(100)
    expect(diag.inconsistencias.length).toBe(0)
  })
})
