import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import { criarPeca, listarPecas, listarEventosDaPeca, excluirPeca, listarConsumosDaPeca, atualizarStatusPeca } from './pecasRepo'
import { listarMateriais } from './materiaisRepo'

describe('repositório de peças', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
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
})
