import { db } from '../db/schema'
import { getSessionKey } from './auth'
import { encryptText, decryptText } from './crypto'
import { supabase } from './supabase'
import { syncPerfisFromSupabase } from './perfisRepo'

export let isApplyingRemote = false

// ──────────────────────────────────────────────────────────────────────────────
// Configuração de Auto-save
// ──────────────────────────────────────────────────────────────────────────────

/** Tempo de inatividade antes de auto-salvar na nuvem (30 minutos) */
const AUTO_SAVE_INACTIVITY_MS = 30 * 60 * 1000

/** Timer de inatividade para auto-save */
let inactivityTimer: ReturnType<typeof setTimeout> | null = null

/** Flag para indicar que houve mudança local desde o último upload */
let hasPendingLocalChanges = false

/** Flag para evitar sync concorrente */
let isSyncing = false

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
  'configuracoes',
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
        hasPendingLocalChanges = true
        resetInactivityTimer()
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
        hasPendingLocalChanges = true
        resetInactivityTimer()
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

// ──────────────────────────────────────────────────────────────────────────────
// Upload — envia eventos locais pendentes para o Supabase
// ──────────────────────────────────────────────────────────────────────────────

async function uploadPendingEvents(): Promise<void> {
  const key = getSessionKey()
  if (!key) return

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
    return uploadWithPerfilId(retryId, key)
  }

  return uploadWithPerfilId(perfil_id, key)
}

async function uploadWithPerfilId(perfil_id: number, key: CryptoKey): Promise<void> {
  const pending = await db.syncQueue.toArray()
  if (pending.length === 0) {
    hasPendingLocalChanges = false
    return
  }

  // Envia em lotes de 50 para não estourar payload
  const BATCH_SIZE = 50
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    const payloads = await Promise.all(
      batch.map(async (event) => ({
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
      const ids = batch.map((p) => p.id!)
      await db.syncQueue.bulkDelete(ids)
    } else {
      console.error('[Sync Upload] Erro ao subir lote de eventos:', error)
      return // Para e tenta de novo na próxima vez
    }
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

async function downloadRemoteEvents(perfil_id: number, key: CryptoKey): Promise<void> {
  const lastSync = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
  let lastTs = lastSync ? Number(lastSync.valor) : 0

  const { data: remoteEvents, error: fetchError } = await supabase
    .from('sync_events')
    .select('*')
    .eq('perfil_id', perfil_id)
    .gt('timestamp', lastTs)
    .order('timestamp', { ascending: true })
    .limit(500) // Limita para não travar com histórico enorme

  if (fetchError) {
    console.error('[Sync Download] Erro ao baixar eventos:', fetchError)
    return
  }

  if (!remoteEvents || remoteEvents.length === 0) return

  console.log(`[Sync Download] Aplicando ${remoteEvents.length} evento(s) remotos...`)

  isApplyingRemote = true
  try {
    for (const event of remoteEvents) {
      try {
        const table = db.table(event.tabela)
        const id = isNaN(Number(event.registro_id)) ? event.registro_id : Number(event.registro_id)

        if (event.acao === 'delete') {
          await table.delete(id)
        } else if (event.dados_criptografados) {
          const jsonStr = await decryptText(key, event.dados_criptografados)
          const obj = JSON.parse(jsonStr)
          await table.put(obj)
        }
        lastTs = event.timestamp
      } catch (eventErr) {
        console.warn(`[Sync Download] Erro ao aplicar evento ${event.id}:`, eventErr)
        // Continua com os próximos eventos em vez de abortar tudo
        lastTs = event.timestamp
      }
    }

    // Verifica integridade do ledger após aplicar eventos remotos
    import('./ledgerVerification').then(({ verificarIntegridadeDoLedger }) => {
      verificarIntegridadeDoLedger()
    }).catch(() => {})
  } finally {
    isApplyingRemote = false
  }

  // Atualiza o lastSyncTimestamp
  if (lastSync) {
    await db.syncMetadata.update(lastSync.id!, { valor: String(lastTs) })
  } else {
    await db.syncMetadata.add({ chave: 'lastSyncTimestamp', valor: String(lastTs) })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Detecção de Conflito — compara timestamps locais vs remotos
// ──────────────────────────────────────────────────────────────────────────────

export interface ConflictResult {
  status: 'remote_newer' | 'local_newer' | 'in_sync' | 'no_remote'
  localLastChange: number
  remoteLastChange: number
}

/** Compara o estado local com o remoto para decidir quem é mais novo */
async function detectConflict(perfil_id: number): Promise<ConflictResult> {
  // Último evento local pendente (se há dados locais mais novos que o último sync)
  const localQueue = await db.syncQueue.toArray()
  const lastLocalChange = localQueue.length > 0
    ? Math.max(...localQueue.map((e) => e.timestamp))
    : 0

  // Último evento remoto
  const { data: remoteLatest } = await supabase
    .from('sync_events')
    .select('timestamp')
    .eq('perfil_id', perfil_id)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()

  const remoteLastChange = remoteLatest?.timestamp ?? 0

  if (remoteLastChange === 0 && lastLocalChange === 0) {
    return { status: 'in_sync', localLastChange: 0, remoteLastChange: 0 }
  }
  if (remoteLastChange === 0) {
    return { status: 'no_remote', localLastChange: lastLocalChange, remoteLastChange: 0 }
  }

  // Se há eventos locais não enviados que são mais recentes que o remoto
  if (lastLocalChange > remoteLastChange) {
    return { status: 'local_newer', localLastChange: lastLocalChange, remoteLastChange }
  }

  // Se o remoto tem eventos mais novos do que o nosso último sync
  const lastSync = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
  const lastSyncTs = lastSync ? Number(lastSync.valor) : 0

  if (remoteLastChange > lastSyncTs) {
    return { status: 'remote_newer', localLastChange: lastLocalChange, remoteLastChange }
  }

  return { status: 'in_sync', localLastChange: lastLocalChange, remoteLastChange }
}

// ──────────────────────────────────────────────────────────────────────────────
// Callback de conflito — registrado pela UI para mostrar aviso ao usuário
// ──────────────────────────────────────────────────────────────────────────────

type ConflictCallback = (conflict: ConflictResult) => void
let onConflictDetected: ConflictCallback | null = null

/** A UI registra um callback para ser notificada de conflitos */
export function setConflictCallback(cb: ConflictCallback | null) {
  onConflictDetected = cb
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync Principal — chamado no login e periodicamente
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sincronização completa:
 * 1. Sincroniza perfis (metadados)
 * 2. Detecta conflitos (local vs remoto)
 * 3. Se remoto é mais novo → baixa eventos
 * 4. Se local é mais novo → avisa o usuário (não sobrescreve)
 * 5. Se está em sincronia → faz upload de pendentes se houver
 */
export async function syncWithSupabase() {
  if (isSyncing) return
  isSyncing = true

  try {
    const key = getSessionKey()
    if (!key) return

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

    // 3. Detecção de conflitos
    const conflict = await detectConflict(perfil_id)
    console.log(`[Sync] Estado: ${conflict.status} | Local: ${conflict.localLastChange} | Remoto: ${conflict.remoteLastChange}`)

    switch (conflict.status) {
      case 'remote_newer':
        // Remoto é mais novo — baixa dados do Supabase para o dispositivo
        console.log('[Sync] Remoto mais recente — baixando dados...')
        await downloadRemoteEvents(perfil_id, key)
        break

      case 'local_newer':
        // Local é mais novo — avisa o usuário e NÃO sobrescreve
        console.log('[Sync] Local mais recente — aguardando auto-save ou ação do usuário.')
        if (onConflictDetected) {
          onConflictDetected(conflict)
        }
        // Não faz upload automático aqui — espera o timer de inatividade
        break

      case 'no_remote':
        // Não há dados remotos — faz upload
        console.log('[Sync] Sem dados remotos — enviando dados locais...')
        await uploadPendingEvents()
        break

      case 'in_sync':
        // Tudo sincronizado — faz upload de pendentes restantes (se houver)
        if (hasPendingLocalChanges) {
          await uploadPendingEvents()
        }
        break
    }
  } catch (err) {
    console.error('[Sync] Erro geral na sincronização:', err)
  } finally {
    isSyncing = false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync no Login — chamado IMEDIATAMENTE após o login
// Garante que dados apareçam no dispositivo novo
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sync agressivo pós-login: força download completo se o dispositivo está vazio.
 * Diferente do sync periódico, este não espera — baixa tudo de uma vez.
 */
export async function syncOnLogin() {
  const key = getSessionKey()
  if (!key) return

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

  // 3. Verifica se o dispositivo local tem dados
  let totalLocalRecords = 0
  for (const tableName of TABLES_TO_SYNC) {
    try {
      totalLocalRecords += await db.table(tableName).count()
    } catch {
      // tabela pode não existir
    }
  }

  // 4. Verifica quantos eventos remotos existem
  const { count: remoteCount } = await supabase
    .from('sync_events')
    .select('id', { count: 'exact', head: true })
    .eq('perfil_id', perfil_id)

  console.log(`[Sync Login] Registros locais: ${totalLocalRecords} | Eventos remotos: ${remoteCount ?? 0}`)

  if (totalLocalRecords === 0 && (remoteCount ?? 0) > 0) {
    // Dispositivo vazio com dados na nuvem — faz download completo
    console.log('[Sync Login] Dispositivo vazio — baixando todos os dados da nuvem...')
    // Reseta o lastSyncTimestamp para baixar tudo
    const lastSync = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
    if (lastSync) {
      await db.syncMetadata.update(lastSync.id!, { valor: '0' })
    }
    // Baixa em loop até não ter mais eventos
    let hasMore = true
    while (hasMore) {
      const beforeCount = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
      const beforeTs = beforeCount ? Number(beforeCount.valor) : 0
      await downloadRemoteEvents(perfil_id, key)
      const afterCount = await db.syncMetadata.where('chave').equals('lastSyncTimestamp').first()
      const afterTs = afterCount ? Number(afterCount.valor) : 0
      hasMore = afterTs > beforeTs // Se avançou, pode ter mais
    }
    console.log('[Sync Login] Download completo finalizado.')
  } else if (totalLocalRecords > 0 && (remoteCount ?? 0) > 0) {
    // Tem dados locais E remotos — verifica conflito
    const conflict = await detectConflict(perfil_id)
    if (conflict.status === 'remote_newer') {
      console.log('[Sync Login] Remoto mais recente — baixando atualizações...')
      await downloadRemoteEvents(perfil_id, key)
    } else if (conflict.status === 'local_newer') {
      console.log('[Sync Login] Local mais recente — dados do dispositivo são mais novos que a nuvem.')
      if (onConflictDetected) {
        onConflictDetected(conflict)
      }
    }
  } else if (totalLocalRecords > 0 && (remoteCount ?? 0) === 0) {
    // Tem dados locais mas nada na nuvem — faz primeiro upload
    console.log('[Sync Login] Nuvem vazia — fazendo primeiro upload dos dados locais...')
    await uploadPendingEvents()
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Forçar Upload — para uso manual (ex: botão "Salvar na nuvem")
// ──────────────────────────────────────────────────────────────────────────────

export async function forceUpload() {
  await uploadPendingEvents()
}

// ──────────────────────────────────────────────────────────────────────────────
// Forçar Download — para uso manual (ex: botão "Restaurar da nuvem")
// ──────────────────────────────────────────────────────────────────────────────

export async function forceDownload() {
  const key = getSessionKey()
  if (!key) throw new Error('Sessão não encontrada')

  const perfil_id = await resolvePerfilId()
  if (!perfil_id) throw new Error('Perfil não sincronizado')

  await downloadRemoteEvents(perfil_id, key)
}
