import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
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

  })

  it('sincroniza registro de vida útil com identificador composto sem duplicar', async () => {
    const registro = { id: 'peca-uuid:forma:42', tipo: 'forma', recursoId: 42, pecaRef: 'peca-uuid', quantidade: 2, unidade: 'uso', confirmadoEm: '2026-11-06' }
    remoteEvents.push({ id: 'evento-vida', perfil_id: 1, tabela: 'registrosVidaUtil', registro_id: registro.id, acao: 'insert', dados_criptografados: JSON.stringify(registro), timestamp: 1000 })
    const { syncWithSupabase } = await import('./syncService')
    await syncWithSupabase()
    expect(await db.registrosVidaUtil.get(registro.id)).toMatchObject(registro)
    await syncWithSupabase()
    expect(await db.registrosVidaUtil.count()).toBe(1)
  })

  it('interrompe a sincronização sem substituir peça de identidade diferente nem avançar cursor', async () => {
    await db.pecas.add({ id: 42, identificadorUnico: 'identidade-local', nome: 'Peça local', formaId: 1, status: 'planejada', criadaEm: '2026-11-06' })
    await db.materiais.add({ id: 2, nome: 'Material local', categoriaId: 1, unidade: 'g', quantidadeEstoque: 10, custoUnitario: 1 })
    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: '1000' })
    remoteEvents.push({ id: 'alteracao-material', perfil_id: 1, tabela: 'materiais', registro_id: '2', acao: 'update', dados_criptografados: JSON.stringify({ id: 2, nome: 'Material remoto', categoriaId: 1, unidade: 'g', quantidadeEstoque: 5, custoUnitario: 1 }), timestamp: 1500 })
    remoteEvents.push({ id: 'evento-remoto', perfil_id: 1, tabela: 'pecas', registro_id: '42', acao: 'insert', dados_criptografados: JSON.stringify({ id: 42, identificadorUnico: 'identidade-remota', nome: 'Outra peça', formaId: 1, status: 'planejada', criadaEm: '2026-11-06' }), timestamp: 2000 })
    const { syncWithSupabase } = await import('./syncService')
    await expect(syncWithSupabase()).rejects.toThrow(/conflito de identidade/i)
    expect(await db.pecas.get(42)).toMatchObject({ nome: 'Peça local', identificadorUnico: 'identidade-local' })
    expect(await db.materiais.get(2)).toMatchObject({ nome: 'Material local', quantidadeEstoque: 10 })
    expect((await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first())?.valor).toBe('1000')
  })

  it('protege uma peça identificada de exclusão remota sem identidade correspondente', async () => {
    await db.pecas.add({ id: 42, identificadorUnico: 'identidade-local', nome: 'Peça local', formaId: 1, status: 'planejada', criadaEm: '2026-11-06' })
    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: '1000' })
    remoteEvents.push({ id: 'exclusao-remota', perfil_id: 1, tabela: 'pecas', registro_id: '42', acao: 'delete', dados_criptografados: '', timestamp: 2000 })
    const { syncWithSupabase } = await import('./syncService')
    await expect(syncWithSupabase()).rejects.toThrow(/conflito de identidade/i)
    expect(await db.pecas.get(42)).toMatchObject({ nome: 'Peça local' })
  })

  it('aplica exclusão remota com a mesma identidade', async () => {
    await db.pecas.add({ id: 42, identificadorUnico: 'identidade-local', nome: 'Peça local', formaId: 1, status: 'planejada', criadaEm: '2026-11-06' })
    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: '1000' })
    remoteEvents.push({ id: 'exclusao-remota', perfil_id: 1, tabela: 'pecas', registro_id: '42', acao: 'delete', dados_criptografados: JSON.stringify({ identificadorUnico: 'identidade-local' }), timestamp: 2000 })
    const { syncWithSupabase } = await import('./syncService')
    await syncWithSupabase()
    expect(await db.pecas.get(42)).toBeUndefined()
  })

  it('baixa eventos remotos empatados no timestamp do ultimo sync local', async () => {
    remoteEvents.push({
      id: '00000000-0000-4000-8000-000000000002',
      perfil_id: 1,
      tabela: 'materiais',
      registro_id: '2',
      acao: 'insert',
      dados_criptografados: JSON.stringify({
          id: 2,
          nome: 'Pigmento remoto',
          categoriaId: 1,
          unidade: 'g',
          quantidadeEstoque: 15,
          custoUnitario: 0.9,
        }),
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
    remoteEvents.push({
      id: '00000000-0000-4000-8000-000000000001',
      perfil_id: 1,
      tabela: 'materiais',
      registro_id: '3',
      acao: 'insert',
      dados_criptografados: JSON.stringify({
          id: 3,
          nome: 'Evento remoto posterior',
          categoriaId: 1,
          unidade: 'g',
          quantidadeEstoque: 5,
          custoUnitario: 1.2,
        }),
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
