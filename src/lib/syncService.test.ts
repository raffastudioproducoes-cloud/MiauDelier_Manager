import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { CHAVE_USUARIO_NUVEM, setupAccount } from './auth'
import { normalizeRemoteSyncObject, prepareLocalCacheForUser, registerDexieHooks } from './syncService'
import { atualizarMaterial, criarMaterial } from '../features/producao/materiaisRepo'
import { criarForma, atualizarForma } from '../features/producao/formasRepo'

vi.mock('../features/producao/estoqueServidor', () => ({ transacaoComEstoque: <T,>(fn: () => Promise<T>) => fn() }))

let hooksRegistered = false

async function waitForSyncQueueLength(expectedLength: number) {
  const deadline = Date.now() + 1000
  while (Date.now() < deadline) {
    const events = await db.syncQueue.toArray()
    if (events.length === expectedLength) return events
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return db.syncQueue.toArray()
}

describe('syncService Dexie hooks', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-teste')

    if (!hooksRegistered) {
      registerDexieHooks()
      hooksRegistered = true
    }
  })

  it('enfileira inserts com o id local gerado pelo Dexie no payload', async () => {
    const id = await criarMaterial({
      nome: 'Resina Cristal',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 100,
      custoUnitario: 0.25,
    })

    const [event] = await waitForSyncQueueLength(1)
    expect(event).toMatchObject({
      tabela: 'materiais',
      registroId: String(id),
      acao: 'insert',
    })
    expect(JSON.parse(event.dadosString)).toMatchObject({
      id,
      nome: 'Resina Cristal',
    })
  })

  it('enfileira updates com o registro atualizado completo', async () => {
    const id = await criarMaterial({
      nome: 'Resina',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 100,
      custoUnitario: 0.25,
    })
    await waitForSyncQueueLength(1)
    await db.syncQueue.clear()

    await atualizarMaterial(id, {
      nome: 'Resina Premium',
      categoriaId: 1,
      unidade: 'g',
      custoUnitario: 0.4,
    })
    const [event] = await waitForSyncQueueLength(1)
    expect(event).toMatchObject({
      tabela: 'materiais',
      registroId: String(id),
      acao: 'update',
    })
    expect(JSON.parse(event.dadosString)).toMatchObject({
      id,
      nome: 'Resina Premium',
      unidade: 'g',
      quantidadeEstoque: 100,
      custoUnitario: 0.4,
    })
  })

  it('enfileira o saldo de silicone após registrar o primeiro consumo em forma existente', async () => {
    const materialId = await criarMaterial({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const dados = { nome: 'Forma existente', geometria: 'direto' as const, dimensoesCm: {}, vidaUtilUsos: 100 }
    const formaId = await criarForma(dados)
    await waitForSyncQueueLength(2)
    await db.syncQueue.clear()
    await atualizarForma(formaId, { ...dados, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2 })
    await waitForSyncQueueLength(2)
    const eventos = await db.syncQueue.toArray()
    const estoque = eventos.find((evento) => evento.tabela === 'materiais' && evento.acao === 'update')
    expect(estoque).toBeDefined()
    expect(JSON.parse(estoque!.dadosString)).toMatchObject({ id: materialId, quantidadeEstoque: 8 })
    const forma = eventos.find((evento) => evento.tabela === 'formas' && evento.acao === 'update')
    expect(forma).toBeDefined()
    expect(JSON.parse(forma!.dadosString)).toMatchObject({ id: formaId, baixaSiliconeConfirmada: true })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
  })

  it('não enfileira criação, alteração ou exclusão de transação revertida', async () => {
    const existente = await db.materiais.add({ nome: 'Original', categoriaId: 1, unidade: 'un', quantidadeEstoque: 5, custoUnitario: 1 })
    await waitForSyncQueueLength(1)
    await db.syncQueue.clear()
    await expect(db.transaction('rw', db.materiais, async () => {
      await db.materiais.add({ nome: 'Revertido', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 1 })
      await db.materiais.update(existente, { quantidadeEstoque: 2 })
      await db.materiais.delete(existente)
      throw new Error('reverter')
    })).rejects.toThrow('reverter')
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(await db.syncQueue.toArray()).toEqual([])
    expect((await db.materiais.get(existente))?.quantidadeEstoque).toBe(5)
  })

  it('enfileira apenas o estado final quando um registro muda várias vezes na mesma transação', async () => {
    const id = await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    await waitForSyncQueueLength(1)
    await db.syncQueue.clear()
    await db.transaction('rw', db.materiais, async () => {
      await db.materiais.update(id, { quantidadeEstoque: 8 })
      await db.materiais.update(id, { quantidadeEstoque: 7 })
    })
    const eventos = await waitForSyncQueueLength(1)
    expect(eventos).toHaveLength(1)
    expect(JSON.parse(eventos[0].dadosString)).toMatchObject({ id, quantidadeEstoque: 7 })
  })

  it('enfileira uma exclusão apenas após o commit e conserva a identidade da peça', async () => {
    const id = await db.pecas.add({ nome: 'Peça', formaId: 1, status: 'planejada', criadaEm: '2026-11-06', identificadorUnico: 'uuid-da-peca' })
    await waitForSyncQueueLength(1)
    await db.syncQueue.clear()
    await db.transaction('rw', db.pecas, async () => { await db.pecas.delete(id) })
    const eventos = await waitForSyncQueueLength(1)
    expect(eventos[0]).toMatchObject({ tabela: 'pecas', acao: 'delete', registroId: String(id) })
    expect(JSON.parse(eventos[0].dadosString)).toEqual({ identificadorUnico: 'uuid-da-peca' })
  })

  it('aguarda a transação raiz antes de enfileirar uma transação aninhada', async () => {
    await expect(db.transaction('rw', db.materiais, async () => {
      await db.transaction('rw', db.materiais, async () => {
        await db.materiais.add({ nome: 'Aninhado', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 1 })
      })
      throw new Error('reverter transação raiz')
    })).rejects.toThrow('reverter transação raiz')
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(await db.syncQueue.toArray()).toEqual([])
  })
})

describe('normalizeRemoteSyncObject', () => {
  it('preserva o id remoto do evento quando o payload antigo não tem id', () => {
    expect(normalizeRemoteSyncObject({ nome: 'Resina' }, '42')).toEqual({
      id: 42,
      nome: 'Resina',
    })
  })

  it('não sobrescreve id já presente no payload', () => {
    expect(normalizeRemoteSyncObject({ id: 7, nome: 'Resina' }, '42')).toEqual({
      id: 7,
      nome: 'Resina',
    })
  })
})

describe('prepareLocalCacheForUser', () => {
  it('limpa dados de outro usuario sem enfileirar deletes', async () => {
    await db.materiais.add({ nome: 'Dado residual', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 1 })
    await db.syncQueue.clear()

    await prepareLocalCacheForUser('novo-usuario')

    expect(await db.materiais.count()).toBe(0)
    expect(await db.syncQueue.count()).toBe(0)
    expect(await db.configuracoes.where('chave').equals(CHAVE_USUARIO_NUVEM).first()).toMatchObject({ valor: 'novo-usuario' })
  })
})
