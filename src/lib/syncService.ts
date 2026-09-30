import { db } from '../db/schema'
import { getSessionKey } from './auth'
import { encryptText, decryptText } from './crypto'
import { supabase } from './supabase'
import { syncPerfisFromSupabase } from './perfisRepo'

export let isApplyingRemote = false

// ──────────────────────────────────────────────────────────────────────────────
// Hooks Dexie — registram mudanças locais na fila de sync
// ──────────────────────────────────────────────────────────────────────────────

export function registerDexieHooks() {
  const tablesToSync = [
    'categoriasMaterial',
    'materiais',
    'formas',
    'pecas',
    'consumosPeca',
    'eventosPeca',
    'clientes',
    'pedidos',
    'transacoes',
    'contas',
    'configuracoes',
    'auditoria',
    'equipamentos',
    'taxas',
  ]

  tablesToSync.forEach((tableName) => {
    const table = db.table(tableName)

    table.hook('creating', function (_primKey, obj) {
      if (isApplyingRemote) return
      this.onsuccess = function (realPrimKey) {
        db.syncQueue.add({
          id: crypto.randomUUID(),
          tabela: tableName,
          registroId: String(realPrimKey),
          acao: 'insert',
          dadosString: JSON.stringify(obj),
          timestamp: Date.now(),
          sincronizado: false,
        })
      }
    })

    table.hook('updating', function (_modifications, primKey, _obj) {
      if (isApplyingRemote) return
      this.onsuccess = function (updatedObj) {
        db.syncQueue.add({
          id: crypto.randomUUID(),
          tabela: tableName,
          registroId: String(primKey),
          acao: 'update',
          dadosString: JSON.stringify(updatedObj),
          timestamp: Date.now(),
          sincronizado: false,
        })
      }
    })

    table.hook('deleting', function (primKey) {
      if (isApplyingRemote) return
      this.onsuccess = function () {
        db.syncQueue.add({
          id: crypto.randomUUID(),
          tabela: tableName,
          registroId: String(primKey),
          acao: 'delete',
          dadosString: '{}',
          timestamp: Date.now(),
          sincronizado: false,
        })
      }
    })
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync principal — upload + download de eventos criptografados
// ──────────────────────────────────────────────────────────────────────────────

export async function syncWithSupabase() {
  const key = getSessionKey()
  if (!key) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // 1. Sincroniza perfis de ateliê (não passam pelo Event Sourcing, têm sync dedicado)
  await syncPerfisFromSupabase().catch((e) =>
    console.warn('Erro ao sincronizar perfis:', e),
  )

  // 2. Resolve o perfil_id do Supabase para o perfil atualmente ativo
  //    Busca o primeiro perfil do usuário que tenha supabaseId definido.
  const { getPerfilAtivo } = await import('./perfisRepo')
  const perfilAtivo = await getPerfilAtivo()

  // Se o perfil ativo ainda não tem supabaseId (criado offline), não há
  // como referenciar sync_events — aborta a parte de event-sourcing por agora.
  if (!perfilAtivo.supabaseId) {
    console.warn('syncWithSupabase: perfil ativo ainda não sincronizado com Supabase, pulando event-sourcing.')
    return
  }

  const perfil_id = perfilAtivo.supabaseId

  // 3. Upload dos eventos locais pendentes
  const pending = await db.syncQueue.where('sincronizado').equals(0).toArray()

  if (pending.length > 0) {
    const payloads = await Promise.all(
      pending.map(async (event) => ({
        id: event.id,
        perfil_id,
        tabela: event.tabela,
        registro_id: event.registroId,
        acao: event.acao,
        dados_criptografados:
          event.dadosString === '{}' ? '' : await encryptText(key, event.dadosString),
        timestamp: event.timestamp,
      })),
    )

    const { error } = await supabase.from('sync_events').insert(payloads)
    if (!error) {
      const ids = pending.map((p) => p.id!)
      await db.syncQueue.bulkDelete(ids)
    } else {
      console.error('Erro ao subir eventos de sincronização:', error)
    }
  }

  // 4. Download dos eventos remotos mais recentes
  const lastSync = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
  let lastTs = lastSync ? Number(lastSync.valor) : 0

  const { data: remoteEvents, error: fetchError } = await supabase
    .from('sync_events')
    .select('*')
    .eq('perfil_id', perfil_id)
    .gt('timestamp', lastTs)
    .order('timestamp', { ascending: true })

  if (fetchError) {
    console.error('Erro ao baixar eventos de sincronização:', fetchError)
    return
  }

  if (!remoteEvents || remoteEvents.length === 0) return

  isApplyingRemote = true
  try {
    for (const event of remoteEvents) {
      const table = db.table(event.tabela)
      const id = isNaN(Number(event.registro_id)) ? event.registro_id : Number(event.registro_id)

      if (event.acao === 'delete') {
        await table.delete(id)
      } else {
        const jsonStr = await decryptText(key, event.dados_criptografados)
        const obj = JSON.parse(jsonStr)
        await table.put(obj)
      }
      lastTs = event.timestamp
    }

    // Verifica integridade do ledger após aplicar eventos remotos
    import('./ledgerVerification').then(({ verificarIntegridadeDoLedger }) => {
      verificarIntegridadeDoLedger()
    })
  } catch (err) {
    console.error('Erro ao aplicar evento remoto:', err)
  } finally {
    isApplyingRemote = false
  }

  if (lastSync) {
    await db.syncMetadata.update(lastSync.id!, { valor: String(lastTs) })
  } else {
    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: String(lastTs) })
  }
}
