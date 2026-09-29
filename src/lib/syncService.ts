import { db } from '../db/schema'
import { getSessionKey } from './auth'
import { encryptText, decryptText } from './crypto'
import { supabase } from './supabase'

export let isApplyingRemote = false

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

export async function syncWithSupabase() {
  const key = getSessionKey()
  if (!key) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: perfis } = await supabase.from('perfis').select('id').eq('user_id', user.id).single()
  if (!perfis) return

  const perfil_id = perfis.id

  // 1. Upload local changes
  const pending = await db.syncQueue.where('sincronizado').equals(0).toArray()

  if (pending.length > 0) {
    const payloads = await Promise.all(
      pending.map(async (event) => {
        return {
          id: event.id,
          perfil_id,
          tabela: event.tabela,
          registro_id: event.registroId,
          acao: event.acao,
          dados_criptografados: event.dadosString === '{}' ? '' : await encryptText(key, event.dadosString),
          timestamp: event.timestamp,
        }
      })
    )

    const { error } = await supabase.from('sync_events').insert(payloads)
    if (!error) {
      const ids = pending.map((p) => p.id!)
      await db.syncQueue.bulkDelete(ids)
    } else {
      console.error('Erro ao subir eventos de sincronização:', error)
    }
  }

  // 2. Download remote changes
  const lastSync = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
  let lastTs = lastSync ? Number(lastSync.valor) : 0

  const { data: remoteEvents, error: fetchError } = await supabase
    .from('sync_events')
    .select('*')
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

    // Após mesclar os dados, verifica se o usuário não alterou o Dexie local maliciosamente
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
