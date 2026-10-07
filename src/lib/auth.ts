import { db } from '../db/schema'
import { supabase } from './supabase'

// Compatibilidade com backups antigos. A autenticacao real e do Supabase Auth;
// nenhum dado local ou remoto depende de chave de cifragem.
export const CHAVE_SALT = 'auth.configurada'
export const CHAVE_VERIFICADOR = 'auth.verificador'
export const CHAVE_DEK_SENHA = 'auth.legacy.dek_senha'
export const CHAVE_MIGRACAO_DEK = 'auth.legacy.removida'
const CHAVE_LOCAL_STORAGE_SESSAO = 'miaudelier_session'
type LocalSession = { authenticated: true }
let session: LocalSession | null = null
export class ContaBloqueadaError extends Error {}

async function salvar(chave: string, valor: string) {
  const registro = await db.configuracoes.where('chave').equals(chave).first()
  if (registro) await db.configuracoes.update(registro.id!, { valor })
  else await db.configuracoes.add({ chave, valor })
}

export async function hasAccountConfigured() {
  return Boolean(await db.configuracoes.where('chave').equals(CHAVE_SALT).first())
}

export async function setupAccount(_password: string, opcoes: { apagandoDadosExistentes?: boolean } = {}) {
  if (!opcoes.apagandoDadosExistentes && await hasAccountConfigured()) {
    throw new Error('ja existe uma conta configurada neste dispositivo')
  }
  await salvar(CHAVE_SALT, 'true')
  await salvar(CHAVE_MIGRACAO_DEK, 'true')
  session = { authenticated: true }
  localStorage.setItem(CHAVE_LOCAL_STORAGE_SESSAO, 'true')
  return { key: session }
}

export async function login(_password: string): Promise<LocalSession | null> {
  if (!await hasAccountConfigured()) return null
  session = { authenticated: true }
  localStorage.setItem(CHAVE_LOCAL_STORAGE_SESSAO, 'true')
  return session
}

export async function restoreSessionKey(): Promise<LocalSession | null> {
  if (localStorage.getItem(CHAVE_LOCAL_STORAGE_SESSAO) !== 'true') return null
  if (!await hasAccountConfigured()) return null
  session = { authenticated: true }
  return session
}

export async function isMigratedToDek() { return true }
export async function migrarParaDek(_password: string) { return }
export async function recuperarCofreComNuvem(_novaSenha: string) {
  if (!await hasAccountConfigured()) await setupAccount(_novaSenha)
  session = { authenticated: true }
  return session
}
export async function alterarSenha(_novaSenha: string) {
  if (!session) throw new Error('Usuario nao esta logado')
}
export function getSessionKey(): LocalSession | null { return session }
export async function ensureWrappedDekInCloud() { return }
export async function repairWrappedDekInCloud() { return }

export function clearSession() {
  session = null
  localStorage.removeItem(CHAVE_LOCAL_STORAGE_SESSAO)
}

export async function deleteUserAccount() {
  const { data: { session: cloudSession } } = await supabase.auth.getSession()
  if (cloudSession?.user) {
    const { error } = await supabase.rpc('delete_user_account')
    if (error) throw new Error('Falha ao excluir conta no servidor: ' + error.message)
    await supabase.auth.signOut()
  }
}

export async function deleteUserData() {
  const { data: { session: cloudSession } } = await supabase.auth.getSession()
  if (cloudSession?.user) {
    const { error } = await supabase.rpc('delete_user_data')
    if (error) throw new Error('Falha ao excluir dados no servidor: ' + error.message)
  }
}
