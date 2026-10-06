/**
 * perfisRepo.ts
 * Gerencia os perfis de ateliê armazenados no Dexie (IndexedDB) e sincronizados
 * de forma incremental com a tabela `perfis` do Supabase.
 *
 * Substitui a implementação anterior que usava localStorage (não sincronizava
 * entre dispositivos).
 */

import Dexie from 'dexie'
import { db } from '../db/schema'
import type { PerfilAtelieDB } from '../db/schema'
import { getDbNameForPerfil as _getDbNameForPerfil } from '../db/schema'
import { supabase } from './supabase'

// ──────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ──────────────────────────────────────────────────────────────────────────────

export type PerfilAtelie = PerfilAtelieDB

export interface DadosNovoPerfil {
  nome: string
  nomeDono?: string
  emailDono?: string
  endereco?: string
  documento?: string
  telefone?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────────────────────

export const RESERVED_DEFAULT_PROFILE_ID = 'padrao'

/** Chave localStorage legada para o perfil ativo e para a migração v7 */
const LEGACY_KEY_ATIVO = 'miaudelier_perfil_ativo'

// ──────────────────────────────────────────────────────────────────────────────
// Re-exporta getDbNameForPerfil (definida em schema.ts, sem circular import)
// ──────────────────────────────────────────────────────────────────────────────

export function getDbNameForPerfil(perfilId?: string): string {
  return _getDbNameForPerfil(perfilId)
}

// ──────────────────────────────────────────────────────────────────────────────
// Perfil padrão (fallback quando o banco está vazio)
// ──────────────────────────────────────────────────────────────────────────────

function buildPerfilPadrao(): PerfilAtelie {
  const now = new Date().toISOString()
  return {
    id: RESERVED_DEFAULT_PROFILE_ID,
    nome: 'Ateliê Principal',
    criadoEm: now,
    updatedAt: now,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CRUD — todos assíncronos (Dexie)
// ──────────────────────────────────────────────────────────────────────────────

/** Retorna todos os perfis cadastrados. Garante que o perfil padrão sempre existe. */
export async function listarPerfis(): Promise<PerfilAtelie[]> {
  const todos = await db.perfisAtelie.orderBy('criadoEm').toArray()

  if (todos.length === 0) {
    const padrao = buildPerfilPadrao()
    await db.perfisAtelie.put(padrao)
    return [padrao]
  }

  if (!todos.some((p) => p.id === RESERVED_DEFAULT_PROFILE_ID)) {
    const padrao = buildPerfilPadrao()
    await db.perfisAtelie.put(padrao)
    return [padrao, ...todos]
  }

  return todos
}

/** Retorna o perfil atualmente ativo. */
export async function getPerfilAtivo(): Promise<PerfilAtelie> {
  const ativoId = localStorage.getItem(LEGACY_KEY_ATIVO) ?? RESERVED_DEFAULT_PROFILE_ID
  const encontrado = await db.perfisAtelie.get(ativoId)
  if (encontrado) return encontrado

  // Fallback: retorna o primeiro perfil disponível
  const todos = await listarPerfis()
  return todos[0]
}

/** Cria um novo perfil e dispara sync com Supabase. */
export async function criarPerfil(dados: string | DadosNovoPerfil): Promise<PerfilAtelie> {
  const info: DadosNovoPerfil = typeof dados === 'string' ? { nome: dados } : dados
  const now = new Date().toISOString()

  const novoPerfil: PerfilAtelie = {
    id: `atelie_${Date.now()}_${crypto.randomUUID().substring(0, 4)}`,
    nome: info.nome.trim() || 'Novo Ateliê',
    nomeDono: info.nomeDono?.trim() || undefined,
    emailDono: info.emailDono?.trim() || undefined,
    endereco: info.endereco?.trim() || undefined,
    documento: info.documento?.trim() || undefined,
    telefone: info.telefone?.trim() || undefined,
    criadoEm: now,
    updatedAt: now,
  }

  await db.perfisAtelie.put(novoPerfil)
  syncPerfilToSupabase(novoPerfil).catch(console.warn)
  return novoPerfil
}

/** Atualiza um perfil existente e dispara sync com Supabase. */
export async function atualizarPerfil(
  id: string,
  dados: Partial<Omit<PerfilAtelie, 'id' | 'criadoEm' | 'supabaseId'>>,
): Promise<PerfilAtelie> {
  const existente = await db.perfisAtelie.get(id)
  if (!existente) throw new Error('Perfil de ateliê não encontrado.')

  const atualizado: PerfilAtelie = {
    ...existente,
    nome: dados.nome !== undefined ? (dados.nome.trim() || existente.nome) : existente.nome,
    nomeDono: dados.nomeDono !== undefined ? dados.nomeDono.trim() : existente.nomeDono,
    emailDono: dados.emailDono !== undefined ? dados.emailDono.trim() : existente.emailDono,
    endereco: dados.endereco !== undefined ? dados.endereco.trim() : existente.endereco,
    documento: dados.documento !== undefined ? dados.documento.trim() : existente.documento,
    telefone: dados.telefone !== undefined ? dados.telefone.trim() : existente.telefone,
    updatedAt: new Date().toISOString(),
  }

  await db.perfisAtelie.put(atualizado)
  syncPerfilToSupabase(atualizado).catch(console.warn)
  return atualizado
}

/** Exclui um perfil secundário, apaga seu banco Dexie e remove do Supabase. */
export async function excluirPerfil(id: string): Promise<void> {
  if (id === RESERVED_DEFAULT_PROFILE_ID) {
    throw new Error('Não é possível excluir o perfil de ateliê principal.')
  }

  const existente = await db.perfisAtelie.get(id)
  if (!existente) throw new Error('Perfil não encontrado para exclusão.')

  await db.perfisAtelie.delete(id)

  const ativoId = localStorage.getItem(LEGACY_KEY_ATIVO)
  if (ativoId === id) {
    localStorage.setItem(LEGACY_KEY_ATIVO, RESERVED_DEFAULT_PROFILE_ID)
  }

  try {
    await Dexie.delete(getDbNameForPerfil(id))
  } catch {
    // ignora erro ao apagar DB isolado
  }

  if (existente.supabaseId) {
    supabase
      .from('perfis')
      .delete()
      .eq('id', existente.supabaseId)
      .then(({ error }) => {
        if (error) console.warn('Erro ao excluir perfil no Supabase:', error)
      })
  }
}

/** Define o perfil ativo (persiste no localStorage). */
export function selecionarPerfil(id: string): void {
  localStorage.setItem(LEGACY_KEY_ATIVO, id)
}

// ──────────────────────────────────────────────────────────────────────────────
// Sincronização com Supabase
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Envia (upsert) um perfil local para a tabela `perfis` do Supabase.
 * Atualiza o campo `supabaseId` no Dexie após a confirmação.
 */
async function syncPerfilToSupabase(perfil: PerfilAtelie): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return

  const payload = {
    user_id: session.user.id,
    nome: perfil.nome,
    nome_dono: perfil.nomeDono ?? null,
    email_dono: perfil.emailDono ?? null,
    documento: perfil.documento ?? null,
    telefone: perfil.telefone ?? null,
    endereco: perfil.endereco ?? null,
    updated_at: perfil.updatedAt,
    ...(perfil.supabaseId ? { id: perfil.supabaseId } : {}),
  }

  const { data, error } = await supabase
    .from('perfis')
    .upsert(payload, { onConflict: perfil.supabaseId ? 'id' : undefined })
    .select('id')
    .single()

  if (error) {
    console.warn('Erro ao sincronizar perfil com Supabase:', error)
    return
  }

  if (data?.id && data.id !== perfil.supabaseId) {
    await db.perfisAtelie.update(perfil.id, { supabaseId: data.id })
  }
}

/**
 * Faz download dos perfis do Supabase e mescla com os dados locais.
 * Chamada no login e quando o syncService dispara.
 */
export async function syncPerfisFromSupabase(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return

  const { data: remotePerfis, error } = await supabase
    .from('perfis')
    .select('id, nome, nome_dono, email_dono, documento, telefone, endereco, criado_em, updated_at')
    .eq('user_id', session.user.id)
    .order('criado_em', { ascending: true })

  if (error || !remotePerfis) {
    console.warn('Erro ao baixar perfis do Supabase:', error)
    return
  }

  for (const remote of remotePerfis) {
    const localMatch = await db.perfisAtelie.where('supabaseId').equals(remote.id).first()

    if (localMatch) {
      const localDate = new Date(localMatch.updatedAt).getTime()
      const remoteDate = new Date(remote.updated_at ?? 0).getTime()
      if (remoteDate > localDate) {
        await db.perfisAtelie.update(localMatch.id, {
          nome: remote.nome,
          nomeDono: remote.nome_dono ?? undefined,
          emailDono: remote.email_dono ?? undefined,
          documento: remote.documento ?? undefined,
          telefone: remote.telefone ?? undefined,
          endereco: remote.endereco ?? undefined,
          updatedAt: remote.updated_at ?? new Date().toISOString(),
        })
      }
    } else {
      // Perfil remoto não existe localmente — cria
      const existingDefault = await db.perfisAtelie.get(RESERVED_DEFAULT_PROFILE_ID)
      const isDefaultSlot = !existingDefault?.supabaseId && remote === remotePerfis[0]

      const localId = isDefaultSlot
        ? RESERVED_DEFAULT_PROFILE_ID
        : `atelie_${Date.now()}_${crypto.randomUUID().substring(0, 4)}`

      await db.perfisAtelie.put({
        id: localId,
        supabaseId: remote.id,
        nome: remote.nome,
        nomeDono: remote.nome_dono ?? undefined,
        emailDono: remote.email_dono ?? undefined,
        documento: remote.documento ?? undefined,
        telefone: remote.telefone ?? undefined,
        endereco: remote.endereco ?? undefined,
        criadoEm: remote.criado_em ?? new Date().toISOString(),
        updatedAt: remote.updated_at ?? new Date().toISOString(),
      })
    }
  }

  // Sobe perfis locais que ainda não têm supabaseId (criados offline)
  const semSupabaseId = await db.perfisAtelie.filter((p) => !p.supabaseId).toArray()
  for (const perfil of semSupabaseId) {
    await syncPerfilToSupabase(perfil)
  }
}
