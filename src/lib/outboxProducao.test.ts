import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { rpc } }))
vi.mock('./perfisRepo', () => ({ getPerfilAtivo: async () => ({ supabaseId: 12 }) }))
import { db } from '../db/schema'
import { registerDexieHooks } from './syncService'
import { criarMaterial } from '../features/producao/materiaisRepo'
import { criarForma } from '../features/producao/formasRepo'
import { criarPeca, excluirPeca } from '../features/producao/pecasRepo'

describe('fila transacional na fabricação', () => {
  beforeAll(() => registerDexieHooks())
  beforeEach(async () => {
    localStorage.clear()
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name: string, callback: () => Promise<unknown>) => callback() } })
    await db.delete()
    await db.open()
    rpc.mockReset()
  })

  it('grava peça, materiais e eventos de sincronização juntos na criação e exclusão', async () => {
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 2 })
    await db.syncQueue.clear()
    rpc.mockResolvedValueOnce({ data: [{ materialId, saldo: 8 }], error: null })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    const eventos = await db.syncQueue.toArray()
    expect(eventos.some(e => e.tabela === 'pecas' && e.registroId === String(pecaId) && e.acao === 'insert')).toBe(true)
    expect(eventos.some(e => e.tabela === 'materiais' && JSON.parse(e.dadosString).quantidadeEstoque === 8)).toBe(true)
    rpc.mockResolvedValueOnce({ data: [{ materialId, saldo: 10 }], error: null })
    await excluirPeca(pecaId)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    expect((await db.syncQueue.toArray()).some(e => e.tabela === 'pecas' && e.registroId === String(pecaId) && e.acao === 'delete')).toBe(true)
  })

  it('não cria peça nem eventos fantasmas quando o servidor recusa o estoque', async () => {
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 2 })
    await db.syncQueue.clear()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Estoque insuficiente' }, status: 400 })
    await expect(criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })).rejects.toThrow(/estoque insuficiente/i)
    expect(await db.pecas.count()).toBe(0)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    expect(await db.syncQueue.count()).toBe(0)
  })
})
