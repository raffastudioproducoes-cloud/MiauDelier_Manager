import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import { criarPeca, listarPecas, listarEventosDaPeca } from './pecasRepo'

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
})
