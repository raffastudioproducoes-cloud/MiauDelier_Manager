import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import {
  criarPeca,
  listarPecas,
  listarEventosDaPeca,
  excluirPeca,
  listarConsumosDaPeca,
  atualizarStatusPeca,
  registrarVendaPeca,
  atualizarPrecoVendaPeca,
} from './pecasRepo'
import { listarMateriais } from './materiaisRepo'
import { criarConta } from '../financeiro/contasRepo'
import { setupAccount, clearSession } from '../../lib/auth'
import { listarAuditoria } from '../auditoria/auditoriaRepo'

describe('repositório de peças', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
    await setupAccount('senha-do-ateliê')
  })

  it('cria peça, registra consumo, decrementa estoque e abre evento inicial', async () => {
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.15 })

    const pecaId = await criarPeca({
      nome: 'Chaveiro gato',
      formaId,
      consumos: [{ materialId, quantidade: 20 }],
    })

    const pecas = await listarPecas()
    expect(pecas).toHaveLength(1)
    expect(pecas[0].status).toBe('planejada')

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(980)

    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos).toHaveLength(1)
    expect(eventos[0].tipo).toBe('criacao')
  })

  it('não decrementa estoque se a peça não puder ser criada por completo (atomicidade)', async () => {
    const formaId = await criarForma({ nome: 'X', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialIdReal = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    const materialIdInexistente = materialIdReal + 999

    await expect(
      criarPeca({
        nome: 'Peça quebrada',
        formaId,
        consumos: [
          { materialId: materialIdReal, quantidade: 10 },
          { materialId: materialIdInexistente, quantidade: 5 },
        ],
      }),
    ).rejects.toThrow()

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(100)
    expect(await listarPecas()).toHaveLength(0)
  })

  it('rejeita consumo maior que o estoque e não grava nada (estoque intacto)', async () => {
    const formaId = await criarForma({ nome: 'Y', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina Cristal', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 880, custoUnitario: 0.1 })

    await expect(
      criarPeca({ nome: 'Peça gigante', formaId, consumos: [{ materialId, quantidade: 5000 }] }),
    ).rejects.toThrow(/estoque insuficiente/i)

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(880)
    expect(await listarPecas()).toHaveLength(0)
    expect(await db.consumosPeca.count()).toBe(0)
  })

  it('rejeita quantidade negativa ou zero em vez de inflar o estoque', async () => {
    const formaId = await criarForma({ nome: 'Z', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.1 })

    await expect(
      criarPeca({ nome: 'Peça negativa', formaId, consumos: [{ materialId, quantidade: -5 }] }),
    ).rejects.toThrow(/maior que zero/i)

    await expect(
      criarPeca({ nome: 'Peça zero', formaId, consumos: [{ materialId, quantidade: 0 }] }),
    ).rejects.toThrow(/maior que zero/i)

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(500)
  })

  it('exclui peça e devolve o material consumido ao estoque', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.1 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 100 }] })

    await excluirPeca(pecaId)

    const materiais = await listarMateriais()
    expect(materiais[0].quantidadeEstoque).toBe(1000)
    expect(await listarPecas()).toHaveLength(0)
    expect(await db.consumosPeca.count()).toBe(0)
    expect(await db.eventosPeca.count()).toBe(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'peca' && r.entidadeId === pecaId)
    expect(registro).toBeDefined()
  })

  it('atualizarPrecoVendaPeca registra auditoria com preço anterior e novo', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [] })

    await atualizarPrecoVendaPeca(pecaId, 30)
    await atualizarPrecoVendaPeca(pecaId, 45)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'peca' && r.entidadeId === pecaId && r.valorNovo === '45')
    expect(registro).toBeDefined()
    expect(registro?.valorAnterior).toBe('30')
  })

  it('lista consumos da peça decorados com o nome do material', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.1 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 100 }] })

    const consumos = await listarConsumosDaPeca(pecaId)
    expect(consumos).toHaveLength(1)
    expect(consumos[0].nomeMaterial).toBe('Resina')
    expect(consumos[0].quantidade).toBe(100)
  })

  it('atualiza status e registra evento no ledger', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [] })

    await atualizarStatusPeca(pecaId, 'em_producao')

    const pecas = await listarPecas()
    expect(pecas[0].status).toBe('em_producao')

    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos.some((e) => e.tipo === 'mudanca_status')).toBe(true)
  })

  it('registrarVendaPeca marca vendida, salva preço e cria transação em uma única operação', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça vendida', formaId, consumos: [] })
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })

    await registrarVendaPeca(pecaId, 50, contaId, 'Venda: Peça vendida')

    const pecas = await listarPecas()
    expect(pecas[0].status).toBe('vendida')
    expect(pecas[0].precoVenda).toBe(50)

    const transacoes = await db.transacoes.where('contaId').equals(contaId).toArray()
    expect(transacoes).toHaveLength(1)
    expect(transacoes[0].descricao).toBe('Venda: Peça vendida')

    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos.some((e) => e.tipo === 'mudanca_status' && e.descricao.includes('vendida'))).toBe(true)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'peca' && r.entidadeId === pecaId && r.valorNovo === '50')
    expect(registro).toBeDefined()
  })

  it('registrarVendaPeca não deixa a peça "vendida" órfã se a escrita da transação falhar (atomicidade)', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça falha', formaId, consumos: [] })
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })

    const addOriginal = db.transacoes.add.bind(db.transacoes)
    const espiao = vi.spyOn(db.transacoes, 'add').mockImplementation(() => {
      throw new Error('falha simulada de gravação (ex.: quota do IndexedDB)')
    })

    await expect(registrarVendaPeca(pecaId, 50, contaId, 'Venda: Peça falha')).rejects.toThrow(/falha simulada/)

    espiao.mockRestore()
    void addOriginal

    const pecas = await listarPecas()
    expect(pecas[0].status).not.toBe('vendida')
    expect(pecas[0].precoVenda).toBeUndefined()

    expect(await db.transacoes.where('contaId').equals(contaId).count()).toBe(0)
    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos.some((e) => e.tipo === 'mudanca_status')).toBe(false)
  })
})
