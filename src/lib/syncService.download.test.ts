import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { encryptText } from './crypto'

const getSessionKeyMock = vi.fn()
const syncPerfisFromSupabaseMock = vi.fn()

type RemoteEvent = {
  id: string
  perfil_id: number
  tabela: string
  registro_id: string
  acao: 'insert' | 'update' | 'delete'
  dados_criptografados: string
  timestamp: number
}

const remoteEvents: RemoteEvent[] = []

vi.mock('./auth', () => ({
  getSessionKey: getSessionKeyMock,
}))

vi.mock('./perfisRepo', () => ({
  getPerfilAtivo: vi.fn(async () => ({ id: 'padrao', supabaseId: 1 })),
  syncPerfisFromSupabase: syncPerfisFromSupabaseMock,
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from: vi.fn((table: string) => {
      if (table !== 'sync_events') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }

      const state = {
        perfilId: null as number | null,
        minTimestamp: null as number | null,
        head: false,
      }

      const builder = {
        select: vi.fn((_columns?: string, options?: { head?: boolean }) => {
          state.head = Boolean(options?.head)
          return builder
        }),
        eq: vi.fn((_column: string, value: number) => {
          state.perfilId = value
          return builder
        }),
        gt: vi.fn((_column: string, value: number) => {
          state.minTimestamp = value
          return builder
        }),
        gte: vi.fn((_column: string, value: number) => {
          state.minTimestamp = value - 1
          return builder
        }),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          const latest = remoteEvents
            .filter((event) => state.perfilId === null || event.perfil_id === state.perfilId)
            .sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id))[0]
          return { data: latest ? { timestamp: latest.timestamp, id: latest.id } : null, error: null }
        }),
        range: vi.fn(async (from: number, to: number) => {
          const rows = remoteEvents
            .filter((event) => state.perfilId === null || event.perfil_id === state.perfilId)
            .filter((event) => state.minTimestamp === null || event.timestamp > state.minTimestamp)
            .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
            .slice(from, to + 1)
          return { data: rows, error: null }
        }),
        insert: vi.fn(async () => ({ error: null })),
      }

      return builder
    }),
  },
}))

describe('syncService download ordering', () => {
  beforeEach(async () => {
    remoteEvents.length = 0
    await db.delete()
    await db.open()
    syncPerfisFromSupabaseMock.mockResolvedValue(undefined)

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ])
    getSessionKeyMock.mockReturnValue(key)
  })

  it('baixa eventos remotos empatados no timestamp do ultimo sync local', async () => {
    const key = getSessionKeyMock()
    remoteEvents.push({
      id: '00000000-0000-4000-8000-000000000002',
      perfil_id: 1,
      tabela: 'materiais',
      registro_id: '2',
      acao: 'insert',
      dados_criptografados: await encryptText(
        key,
        JSON.stringify({
          id: 2,
          nome: 'Pigmento remoto',
          categoriaId: 1,
          unidade: 'g',
          quantidadeEstoque: 15,
          custoUnitario: 0.9,
        }),
      ),
      timestamp: 1000,
    })

    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: '1000' })

    const { syncWithSupabase } = await import('./syncService')
    await syncWithSupabase()

    await expect(db.materiais.get(2)).resolves.toMatchObject({
      nome: 'Pigmento remoto',
      quantidadeEstoque: 15,
    })
  })

  it('nao descarta evento do mesmo timestamp por causa da ordem aleatoria do UUID', async () => {
    const key = getSessionKeyMock()
    remoteEvents.push({
      id: '00000000-0000-4000-8000-000000000001',
      perfil_id: 1,
      tabela: 'materiais',
      registro_id: '3',
      acao: 'insert',
      dados_criptografados: await encryptText(
        key,
        JSON.stringify({
          id: 3,
          nome: 'Evento remoto posterior',
          categoriaId: 1,
          unidade: 'g',
          quantidadeEstoque: 5,
          custoUnitario: 1.2,
        }),
      ),
      timestamp: 2000,
    })

    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: '2000' })
    await db.syncMetadata.add({
      chave: 'lastSyncEventId',
      valor: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    })

    const { syncWithSupabase } = await import('./syncService')
    await syncWithSupabase()

    await expect(db.materiais.get(3)).resolves.toMatchObject({
      nome: 'Evento remoto posterior',
      quantidadeEstoque: 5,
    })
  })
})
