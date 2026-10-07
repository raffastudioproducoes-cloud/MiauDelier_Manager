import Dexie from 'dexie'
import { db, type SyncEvent } from '../db/schema'
import { getSessionKey } from './auth'
import { decryptText } from './crypto'
import { supabase } from './supabase'
import { syncPerfisFromSupabase } from './perfisRepo'
import { logError, logWarn } from './logger'
export let isApplyingRemote = false

// ──────────────────────────────────────────────────────────────────────────────
// Configuração de Auto-save
// ──────────────────────────────────────────────────────────────────────────────

/** Tempo de inatividade antes de auto-salvar na nuvem (5 segundos) */
const AUTO_SAVE_INACTIVITY_MS = 5 * 1000

/** Timer de inatividade para auto-save */
let inactivityTimer: ReturnType<typeof setTimeout> | null = null

/** Flag para indicar que houve mudança local desde o último upload */
let hasPendingLocalChanges = false

/** Flag para evitar sync concorrente */
let isSyncing = false

function addSyncQueueEvent(event: SyncEvent) {
  Dexie.ignoreTransaction(() => db.syncQueue.add(event)).catch(err => {
    console.error(`[DEBUG FATAL] ERRO ao adicionar ${event.tabela} na fila de upload (syncQueue):`, err)
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Tabelas sincronizáveis
// ──────────────────────────────────────────────────────────────────────────────

const TABLES_TO_SYNC = [
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
  'auditoria',
  'equipamentos',
  'taxas',
]

// ──────────────────────────────────────────────────────────────────────────────
// Hooks Dexie — registram mudanças locais na fila de sync
// ──────────────────────────────────────────────────────────────────────────────

export function registerDexieHooks() {
  TABLES_TO_SYNC.forEach((tableName) => {
    const table = db.table(tableName)

    table.hook('creating', function (_primKey, obj) {
      if (isApplyingRemote) return
      this.onsuccess = function (realPrimKey) {
        hasPendingLocalChanges = true
        resetInactivityTimer()
        addSyncQueueEvent({
          id: crypto.randomUUID(),
          tabela: tableName,
          registroId: String(realPrimKey),
          acao: 'insert',
          dadosString: JSON.stringify({ ...obj, id: realPrimKey }),
          timestamp: Date.now(),
          sincronizado: false,
        })
      }
    })

    table.hook('updating', function (_modifications, primKey) {
      if (isApplyingRemote) return
      this.onsuccess = function (updatedObj) {
        hasPendingLocalChanges = true
        resetInactivityTimer()
        if (!updatedObj) return

        Dexie.ignoreTransaction(async () => {
          const currentObj = await table.get(primKey)
          if (!currentObj) return
          await db.syncQueue.add({
            id: crypto.randomUUID(),
            tabela: tableName,
            registroId: String(primKey),
            acao: 'update',
            dadosString: JSON.stringify(currentObj),
            timestamp: Date.now(),
            sincronizado: false,
          })
        }).catch(err => {
          console.error(`[DEBUG FATAL] ERRO ao adicionar ${tableName} na fila de upload (syncQueue):`, err)
        })
      }
    })

    table.hook('deleting', function (primKey) {
      if (isApplyingRemote) return
      this.onsuccess = function () {
        hasPendingLocalChanges = true
        resetInactivityTimer()
        addSyncQueueEvent({
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
// Timer de inatividade — salva na nuvem após 30 min sem alterações
// ──────────────────────────────────────────────────────────────────────────────

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => {
    if (hasPendingLocalChanges) {
      console.log('[Sync] 30 min de inatividade detectados — salvando na nuvem...')
      uploadPendingEvents().catch(console.warn)
    }
  }, AUTO_SAVE_INACTIVITY_MS)
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────────────────────

/** Retorna o perfil_id do Supabase para o perfil ativo, ou null se não sincronizado */
async function resolvePerfilId(): Promise<number | null> {
  const { getPerfilAtivo } = await import('./perfisRepo')
  const perfilAtivo = await getPerfilAtivo()
  return perfilAtivo.supabaseId ?? null
}

/** Calcula um hash simples dos dados locais para verificação anti-tamper */
async function computeLocalDataHash(): Promise<string> {
  let allData = ''
  for (const tableName of TABLES_TO_SYNC) {
    try {
      const count = await db.table(tableName).count()
      allData += `${tableName}:${count};`
    } catch {
      // tabela pode não existir ainda
    }
  }
  // Gera um hash SHA-256 do resumo
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(allData))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function normalizeRemoteSyncObject(obj: unknown, registroId: string): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || 'id' in obj) {
    return obj
  }

  const numericId = Number(registroId)
  return {
    ...obj,
    id: Number.isNaN(numericId) ? registroId : numericId,
  }
}

async function getSyncMetadataValue(chave: string): Promise<string | null> {
  const row = await db.syncMetadata.where('chave').equals(chave).first()
  return row?.valor ?? null
}

async function setSyncMetadataValue(chave: string, valor: string): Promise<void> {
  const row = await db.syncMetadata.where('chave').equals(chave).first()
  if (row?.id) {
    await db.syncMetadata.update(row.id, { valor })
  } else {
    await db.syncMetadata.add({ chave, valor })
  }
}

function isRemoteEventAtOrAfterTimestamp(
  event: { timestamp: number },
  timestamp: number,
): boolean {
  return event.timestamp >= timestamp
}

// ──────────────────────────────────────────────────────────────────────────────
// Upload — envia eventos locais pendentes para o Supabase
// ──────────────────────────────────────────────────────────────────────────────

async function uploadPendingEvents(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const perfil_id = await resolvePerfilId()
  if (!perfil_id) {
    console.warn('[Sync Upload] Perfil ativo sem supabaseId — tentando sync de perfis primeiro...')
    await syncPerfisFromSupabase().catch(console.warn)
    const retryId = await resolvePerfilId()
    if (!retryId) {
      console.warn('[Sync Upload] Perfil ainda sem supabaseId após sync, abortando upload.')
      return
    }
    return uploadWithPerfilId(retryId)
  }

  return uploadWithPerfilId(perfil_id)
}

async function uploadWithPerfilId(perfil_id: number): Promise<void> {
  const pending = await db.syncQueue.toArray()

  if (pending.length === 0) {
    hasPendingLocalChanges = false
    return
  }

  // Envia em lotes de 50 para não estourar payload
  const BATCH_SIZE = 50
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    let payloads
    try {
      payloads = await Promise.all(
        batch.map(async (event) => ({
          id: event.id,
          perfil_id,
          tabela: event.tabela,
          registro_id: event.registroId,
          acao: event.acao,
            dados_criptografados: event.dadosString === '{}' ? '' : event.dadosString,
          timestamp: event.timestamp,
        })),
      )
    } catch (encErr) {
      console.error("ERRO CRÍTICO DE CRIPTOGRAFIA ANTES DO UPLOAD:", encErr)
      return
    }

    const { error } = await supabase.from('sync_events').insert(payloads)
    
    if (error) {
      console.error("🚨 ERRO CRÍTICO SUPABASE:", error)
      throw error // Arremessa o erro para não ser engolido
    }
    
    // Se não houve erro, apaga da fila local
    const ids = batch.map((p) => p.id!)
    await db.syncQueue.bulkDelete(ids)
    console.log(`[Sync Upload] Lote de ${ids.length} evento(s) confirmado pela nuvem.`)
  }

  // Salva o hash de verificação anti-tamper no Supabase
  const hash = await computeLocalDataHash()
  await supabase.from('perfis').update({
    data_hash: hash,
    updated_at: new Date().toISOString(),
  }).eq('id', perfil_id).then(({ error }) => {
    if (error) console.warn('[Sync] Erro ao atualizar hash:', error)
  })

  hasPendingLocalChanges = false
  console.log(`[Sync Upload] ${pending.length} evento(s) enviados com sucesso.`)
}

// ──────────────────────────────────────────────────────────────────────────────
// Download — baixa eventos remotos mais novos que os locais
// ──────────────────────────────────────────────────────────────────────────────

async function downloadRemoteEvents(perfil_id: number, key: CryptoKey | null): Promise<void> {
  const initialLastTs = Number(await getSyncMetadataValue('lastSyncTimestamp') ?? 0)

  let offset = 0
  const LIMIT = 500
  let hasMore = true
  let totalApplied = 0
  let highestTsSeen = initialLastTs

  isApplyingRemote = true
  try {
    while (hasMore) {
      // 1. Paginação Segura (Evita saltar eventos que partilhem o mesmo timestamp)
      const { data: remoteEvents, error: fetchError } = await supabase
        .from('sync_events')
        .select('*')
        .eq('perfil_id', perfil_id)
        .gte('timestamp', initialLastTs)
        .order('timestamp', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + LIMIT - 1)

      const fetchedCount = remoteEvents ? remoteEvents.length : 0
      console.log('SYNC FETCH:', fetchedCount)

      if (fetchError) {
        throw fetchError
      }

      if (!remoteEvents || remoteEvents.length === 0) {
        hasMore = false
        break
      }

      // 2. Ordem de Aplicação (Integridade Relacional)
      // Em caso de empate de timestamp, ordena pela hierarquia estrutural das tabelas
      const sortedEvents = remoteEvents
        .filter((event) => isRemoteEventAtOrAfterTimestamp(event, initialLastTs))
        .sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
          const idxA = TABLES_TO_SYNC.indexOf(a.tabela)
          const idxB = TABLES_TO_SYNC.indexOf(b.tabela)
          const tableOrder = (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99)
          return tableOrder || a.id.localeCompare(b.id)
        })

      const preparedEvents = await Promise.all(sortedEvents.map(async (event) => {
        if (event.acao === 'delete' || event.tabela === 'configuracoes' || !event.dados_criptografados) {
          return { event, obj: null }
        }

        const jsonStr = event.dados_criptografados.trimStart().startsWith('{')
          ? event.dados_criptografados
          : key
            ? await decryptText(key, event.dados_criptografados)
            : (() => { throw new Error('Evento legado cifrado sem compatibilidade com o modo sem criptografia') })()
        return {
          event,
          obj: normalizeRemoteSyncObject(JSON.parse(jsonStr), event.registro_id),
        }
      }))

      // 3. Atomicidade do Timestamp
      // Executamos a aplicação do lote E a atualização do timestamp dentro de UMA ÚNICA transação
      await db.transaction('rw', [...TABLES_TO_SYNC, 'syncMetadata'], async () => {
        let maxTsInBatch = highestTsSeen

        for (const { event, obj } of preparedEvents) {
          try {
            if (event.tabela === 'configuracoes') {
              maxTsInBatch = Math.max(maxTsInBatch, event.timestamp)
              continue
            }

            const table = db.table(event.tabela)
            const id = isNaN(Number(event.registro_id)) ? event.registro_id : Number(event.registro_id)

            if (event.acao === 'delete') {
              await table.delete(id)
            } else if (obj) {
              console.log('SYNC DEXIE INSERT:', obj)
              await table.put(obj)
            }
            maxTsInBatch = Math.max(maxTsInBatch, event.timestamp)
          } catch (eventErr: any) {
            console.error('CRITICAL DECRYPT/INSERT ERROR:', eventErr, event)
            throw eventErr // NÃO ENGOLIR O ERRO: Para a execução imediatamente
          }
        }

        if (sortedEvents.length > 0) {
          await setSyncMetadataValue('lastSyncTimestamp', String(maxTsInBatch))
        }
        
        highestTsSeen = maxTsInBatch
      })

      totalApplied += sortedEvents.length
      offset += LIMIT

      // Se devolveu menos do que o limite estipulado, atingimos o fim
      if (remoteEvents.length < LIMIT) {
        hasMore = false
      }
    }

    if (totalApplied > 0) {
      console.log(`[Sync Download] ${totalApplied} evento(s) aplicado(s) com sucesso.`)
      // Verifica integridade do ledger após aplicar eventos remotos
      import('./ledgerVerification').then(({ verificarIntegridadeDoLedger }) => {
        verificarIntegridadeDoLedger()
      }).catch(() => {})
    }
  } finally {
    isApplyingRemote = false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync Principal — chamado no login e periodicamente
// ──────────────────────────────────────────────────────────────────────────────

export async function syncWithSupabase() {
  if (isSyncing) return
  isSyncing = true

  try {
    const key = getSessionKey()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Sincroniza perfis de ateliê (metadados — não passam pelo Event Sourcing)
    await syncPerfisFromSupabase().catch((e) =>
      console.warn('[Sync] Erro ao sincronizar perfis:', e),
    )

    // 2. Resolve o perfil_id do Supabase
    const perfil_id = await resolvePerfilId()
    if (!perfil_id) {
      console.warn('[Sync] Perfil ativo sem supabaseId — sync de dados adiado.')
      return
    }

    // 3. Verifica último sync local
    const lastSync = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
    const lastSyncTs = lastSync ? Number(lastSync.valor) : 0

    // Se temos dados legados, geramos o snapshot
    if (lastSyncTs === 0) {
      const localQueueCount = await db.syncQueue.count()
      if (localQueueCount === 0) {
        let totalLocal = 0
        for (const tableName of TABLES_TO_SYNC) {
          try { totalLocal += await db.table(tableName).count() } catch { /* ignored */ }
        }
        if (totalLocal > 0) {
          console.log('[Sync] Gerando snapshot completo de dados antigos...')
          await createFullSnapshot()
        }
      }
    }

    // 4. Último evento remoto
    const { data: remoteLatest } = await supabase
      .from('sync_events')
      .select('timestamp, id')
      .eq('perfil_id', perfil_id)
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const remoteLastChange = remoteLatest?.timestamp ?? 0

    // 5. Upload primeiro: um evento remoto indecifrável não pode prender
    // alterações locais legítimas na fila para sempre.
    const queueCount = await db.syncQueue.count()
    if (queueCount > 0) {
      console.log(`[Sync] Temos ${queueCount} eventos locais pendentes — fazendo upload...`)
      await uploadPendingEvents()
    }

    // 6. Download depois. Falha de chave sobe ao chamador e não descarta o evento.
    if (remoteLatest && remoteLastChange >= lastSyncTs) {
      console.log(`[Sync] Remoto tem eventos no timestamp ${remoteLastChange} — baixando...`)
    await downloadRemoteEvents(perfil_id, key)
    }

    if (await db.syncQueue.count() === 0) {
      console.log('[Sync] Tudo sincronizado.')
    }

  } catch (err) {
    console.error('[Sync] Erro geral na sincronização:', err)
    void logError('sync', 'Falha na sincronização com o Supabase.', err)
    throw err
  } finally {
    isSyncing = false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync no Login — chamado IMEDIATAMENTE após o login
// Garante que dados apareçam no dispositivo novo
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sync pós-login. Nunca limpa dados locais: uma falha de rede ou de chave
 * não pode transformar uma tentativa de recuperação em perda de dados.
 */
export async function syncOnLogin() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 1. Primeiro, traz os perfis
  await syncPerfisFromSupabase().catch((e) =>
    console.warn('[Sync Login] Erro ao sincronizar perfis:', e),
  )

  // 2. Resolve o perfil_id
  const perfil_id = await resolvePerfilId()
  if (!perfil_id) {
    console.warn('[Sync Login] Nenhum perfil sincronizado — dispositivo novo sem dados na nuvem.')
    return
  }

  // O fluxo normal baixa e envia sem apagar o estado que já existe neste dispositivo.
  await syncWithSupabase()
}

// ──────────────────────────────────────────────────────────────────────────────
// Snapshot Completo — captura TODOS os dados locais existentes
// Necessário para dados que foram criados antes do sistema de Event Sourcing
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Lê todos os registros de todas as tabelas sincronizáveis e cria eventos
 * de 'insert' na syncQueue para cada um. Isso garante que dados antigos
 * (criados antes do event-sourcing) sejam capturados e enviados para a nuvem.
 *
 * É idempotente: verifica se a syncQueue já tem eventos antes de criar.
 */
export async function createFullSnapshot(): Promise<number> {
  const existingQueue = await db.syncQueue.count()
  if (existingQueue > 0) {
    console.log(`[Snapshot] syncQueue já tem ${existingQueue} evento(s) — pulando snapshot.`)
    return 0
  }

  let totalEvents = 0
  const now = Date.now()

  for (const tableName of TABLES_TO_SYNC) {
    try {
      const allRecords = await db.table(tableName).toArray()
      if (allRecords.length === 0) continue

      // Agrupa em lotes para não sobrecarregar a transação
      const BATCH = 100
      for (let i = 0; i < allRecords.length; i += BATCH) {
        const batch = allRecords.slice(i, i + BATCH)
        const events = batch.map((record, idx) => ({
          id: crypto.randomUUID(),
          tabela: tableName,
          registroId: String(record.id),
          acao: 'insert' as const,
          dadosString: JSON.stringify(record),
          timestamp: now + totalEvents + idx, // garante timestamps únicos e ordenados
          sincronizado: false,
        }))
        await db.syncQueue.bulkAdd(events)
        totalEvents += batch.length
      }

      console.log(`[Snapshot] ${tableName}: ${allRecords.length} registro(s) capturado(s).`)
    } catch (err) {
      logWarn('syncService', `[Snapshot] Erro ao capturar tabela ${tableName}`, err)
    }
  }

  console.log(`[Snapshot] Total: ${totalEvents} evento(s) criados na syncQueue.`)
  hasPendingLocalChanges = true
  return totalEvents
}

// ──────────────────────────────────────────────────────────────────────────────
// Forçar Upload — para uso manual (ex: botão "Salvar na nuvem")
// ──────────────────────────────────────────────────────────────────────────────

export async function forceUpload() {
  // Se a fila está vazia mas tem dados locais, cria snapshot antes
  const queueCount = await db.syncQueue.count()
  if (queueCount === 0) {
    let totalLocal = 0
    for (const t of TABLES_TO_SYNC) {
      try { totalLocal += await db.table(t).count() } catch { /* */ }
    }
    if (totalLocal > 0) {
      await createFullSnapshot()
    }
  }
  await uploadPendingEvents()
}

// ──────────────────────────────────────────────────────────────────────────────
// Forçar Download — para uso manual (ex: botão "Restaurar da nuvem")
// ──────────────────────────────────────────────────────────────────────────────

export async function forceDownload() {
  const key = getSessionKey()

  const perfil_id = await resolvePerfilId()
  if (!perfil_id) throw new Error('Perfil não sincronizado')

  await downloadRemoteEvents(perfil_id, key)
}
