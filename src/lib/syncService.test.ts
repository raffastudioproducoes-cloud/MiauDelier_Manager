import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { CHAVE_USUARIO_NUVEM, setupAccount } from './auth'
import { normalizeRemoteSyncObject, prepareLocalCacheForUser, registerDexieHooks } from './syncService'
import { atualizarMaterial, criarMaterial } from '../features/producao/materiaisRepo'

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
