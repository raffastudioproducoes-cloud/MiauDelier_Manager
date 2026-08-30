import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarConta } from '../financeiro/contasRepo'
import { criarTransacao } from '../financeiro/transacoesRepo'
import { criarMaterial } from '../producao/materiaisRepo'
import { criarForma } from '../producao/formasRepo'
import { criarPeca } from '../producao/pecasRepo'
import { criarCliente } from '../vendas/clientesRepo'
import { criarPedido } from '../vendas/pedidosRepo'
import { obterResumoDashboard } from './dashboardRepo'

describe('resumo do dashboard', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('agrega saldo, lucro do mês, peças, estoque baixo e pedidos abertos', async () => {
    await criarConta({ nome: 'Caixa', saldoInicial: 500 })
    await criarTransacao({ contaId: 1, tipo: 'entrada', valor: 200, descricao: 'Venda', data: new Date().toISOString() })
    await criarTransacao({ contaId: 1, tipo: 'saida', valor: 50, descricao: 'Insumo', data: new Date().toISOString() })

    const materialBaixo = await criarMaterial({ nome: 'Corante raro', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 5, custoUnitario: 1 })
    await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.15 })

    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [{ materialId: materialBaixo, quantidade: 1 }] })

    const clienteId = await criarCliente({ nome: 'Joana' })
    const pecas = await db.pecas.toArray()
    await criarPedido({ clienteId, pecaIds: [pecas[0].id!] })

    const resumo = await obterResumoDashboard()

    expect(resumo.saldoTotal).toBe(650)
    expect(resumo.lucroDoMes).toBe(150)
    expect(resumo.materiaisEstoqueBaixo).toBe(1)
    expect(resumo.pecasEmProducao).toBe(0)
    expect(resumo.pedidosAbertos).toBe(1)
    expect(resumo.eventosRecentes.length).toBeGreaterThan(0)
    expect(resumo.eventosRecentes[0].nomePeca).toBe('Chaveiro gato')
    expect(resumo.fluxoCaixa14Dias).toHaveLength(14)
  })

  it('inclui no lucro do mês uma transação date-only do primeiro dia do mês (regressão timezone)', async () => {
    await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    const agora = new Date()
    const primeiroDiaDoMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
    await criarTransacao({ contaId: 1, tipo: 'entrada', valor: 77, descricao: 'Venda dia 1', data: primeiroDiaDoMes })

    const resumo = await obterResumoDashboard()

    expect(resumo.lucroDoMes).toBe(77)
  })

  it('agrupa transação por data local, não UTC, no fluxo de caixa (regressão fuso horário)', async () => {
    await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    const hoje = new Date()
    const noiteLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 0, 0)
    const anoEsperado = noiteLocal.getFullYear()
    const mesEsperado = String(noiteLocal.getMonth() + 1).padStart(2, '0')
    const diaEsperado = String(noiteLocal.getDate()).padStart(2, '0')
    const chaveEsperada = `${anoEsperado}-${mesEsperado}-${diaEsperado}`

    await criarTransacao({ contaId: 1, tipo: 'entrada', valor: 42, descricao: 'Venda tarde da noite', data: noiteLocal.toISOString() })

    const resumo = await obterResumoDashboard()
    const bucketEsperado = resumo.fluxoCaixa14Dias.find((dia) => dia.data === chaveEsperada)

    expect(bucketEsperado).toBeDefined()
    expect(bucketEsperado!.entradas).toBe(42)
  })

  it('devolve zeros sem quebrar quando não há dado nenhum', async () => {
    const resumo = await obterResumoDashboard()
    expect(resumo.saldoTotal).toBe(0)
    expect(resumo.lucroDoMes).toBe(0)
    expect(resumo.eventosRecentes).toEqual([])
    expect(resumo.fluxoCaixa14Dias).toHaveLength(14)
  })
})
