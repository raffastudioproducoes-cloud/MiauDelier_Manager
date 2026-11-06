import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./estoqueServidor', () => ({ transacaoComEstoque: <T,>(fn: () => Promise<T>) => fn() }))
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarPeca, editarConsumosPeca, atualizarStatusPeca, excluirPeca } from './pecasRepo'

describe('formas adicionais da peça', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('registra quantidades, ajusta diferenças e estorna uma única vez', async () => {
    const principal = await criarForma({ nome: 'Tampo', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 800 })
    const pe = await criarForma({ nome: 'Pé', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 100 })
    const id = await criarPeca({ nome: 'Mesa', formaId: principal, formasAdicionais: [{ formaId: pe, quantidade: 4 }], consumos: [] })
    expect((await db.formas.get(principal))?.usosRealizados).toBe(1)
    expect((await db.formas.get(pe))?.usosRealizados).toBe(4)
    expect((await db.pecas.get(id))?.formasAdicionais).toEqual([{ formaId: pe, quantidade: 4 }])
    await editarConsumosPeca(id, [], { formasAdicionais: [{ formaId: pe, quantidade: 2 }] })
    expect((await db.formas.get(pe))?.usosRealizados).toBe(2)
    await atualizarStatusPeca(id, 'cancelada')
    expect((await db.formas.get(pe))?.usosRealizados).toBe(0)
    await atualizarStatusPeca(id, 'pronta')
    expect((await db.formas.get(pe))?.usosRealizados).toBe(2)
    await excluirPeca(id)
    expect((await db.formas.get(principal))?.usosRealizados).toBe(0)
    expect((await db.formas.get(pe))?.usosRealizados).toBe(0)
  })
})
