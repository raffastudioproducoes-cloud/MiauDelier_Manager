import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { criarMaterial } from '../features/producao/materiaisRepo'
import { registerDexieHooks } from './syncService'
import { zerarDadosManterPerfil } from './backup'

vi.mock('./auth', () => ({ deleteUserData: vi.fn(async () => undefined), CHAVE_USUARIO_NUVEM: 'usuario-nuvem' }))

describe('limpeza com fila transacional', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('remove eventos antigos de criação antes de registrar exclusões', async () => {
    registerDexieHooks()
    await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    expect((await db.syncQueue.toArray()).some(evento => evento.acao === 'insert')).toBe(true)
    await zerarDadosManterPerfil()
    const eventos = await db.syncQueue.toArray()
    expect(await db.materiais.count()).toBe(0)
    expect(eventos.some(evento => evento.acao === 'insert')).toBe(false)
    expect(eventos.some(evento => evento.tabela === 'materiais' && evento.acao === 'delete')).toBe(true)
  })
})
