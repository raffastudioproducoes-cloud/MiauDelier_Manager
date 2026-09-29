import { db } from '../db/schema'
import {
  deriveKey,
  generateSalt,
  encryptText,
  decryptText,
  bytesToBase64,
  base64ToBytes,
  importSessionKey,
  generateDEK,
  wrapDEK,
  unwrapDEK,
  deriveRecoveryKEK,
} from './crypto'
import { supabase } from './supabase'

export const CHAVE_SALT = 'auth.salt'
export const CHAVE_VERIFICADOR = 'auth.verificador'
export const CHAVE_DEK_SENHA = 'auth.dek_senha'
export const CHAVE_MIGRACAO_DEK = 'auth.migracao_dek_concluida'
const CHAVE_TENTATIVAS_FALHAS = 'auth.tentativasFalhas'
const CHAVE_BLOQUEADO_ATE = 'auth.bloqueadoAte'
const CHAVE_LOCAL_STORAGE_SESSAO = 'miaudelier_session_key'
const TEXTO_VERIFICACAO = 'miaudelier-ok'

const MAX_TENTATIVAS = 5
const BLOQUEIO_BASE_MS = 30_000
const BLOQUEIO_MAX_MS = 15 * 60_000

let sessionKey: CryptoKey | null = null

export class ContaBloqueadaError extends Error {}

async function persistSessionKey(key: CryptoKey): Promise<void> {
  try {
    const rawBytes = await crypto.subtle.exportKey('raw', key)
    const base64Key = bytesToBase64(new Uint8Array(rawBytes))
    localStorage.setItem(CHAVE_LOCAL_STORAGE_SESSAO, base64Key)
  } catch {
    // Se o localStorage não estiver disponível, mantemos a sessão apenas em memória.
  }
}

export async function restoreSessionKey(): Promise<CryptoKey | null> {
  try {
    const base64Key = localStorage.getItem(CHAVE_LOCAL_STORAGE_SESSAO)
    if (!base64Key) return null

    const verificadorRegistro = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
    if (!verificadorRegistro) {
      clearSession()
      return null
    }

    const key = await importSessionKey(base64Key)
    const texto = await decryptText(key, verificadorRegistro.valor)
    if (texto !== TEXTO_VERIFICACAO) {
      clearSession()
      return null
    }

    sessionKey = key
    return key
  } catch {
    clearSession()
    return null
  }
}

async function salvarConfiguracao(chave: string, valor: string): Promise<void> {
  const registro = await db.configuracoes.where('chave').equals(chave).first()
  if (registro) {
    await db.configuracoes.update(registro.id!, { valor })
  } else {
    await db.configuracoes.add({ chave, valor })
  }
}

async function lerConfiguracao(chave: string): Promise<string | null> {
  const registro = await db.configuracoes.where('chave').equals(chave).first()
  return registro?.valor ?? null
}

async function apagarConfiguracao(chave: string): Promise<void> {
  const registro = await db.configuracoes.where('chave').equals(chave).first()
  if (registro) await db.configuracoes.delete(registro.id!)
}

async function registrarTentativaFalha(): Promise<void> {
  const tentativasAtuais = Number(await lerConfiguracao(CHAVE_TENTATIVAS_FALHAS)) || 0
  const tentativas = tentativasAtuais + 1
  await salvarConfiguracao(CHAVE_TENTATIVAS_FALHAS, String(tentativas))

  if (tentativas >= MAX_TENTATIVAS) {
    const bloqueioMs = Math.min(
      BLOQUEIO_BASE_MS * 2 ** (tentativas - MAX_TENTATIVAS),
      BLOQUEIO_MAX_MS,
    )
    await salvarConfiguracao(CHAVE_BLOQUEADO_ATE, String(Date.now() + bloqueioMs))
  }
}

async function limparTentativasFalhas(): Promise<void> {
  await apagarConfiguracao(CHAVE_TENTATIVAS_FALHAS)
  await apagarConfiguracao(CHAVE_BLOQUEADO_ATE)
}

async function verificarBloqueio(): Promise<void> {
  const bloqueadoAte = Number(await lerConfiguracao(CHAVE_BLOQUEADO_ATE)) || 0
  if (bloqueadoAte > Date.now()) {
    const restanteSegundos = Math.ceil((bloqueadoAte - Date.now()) / 1000)
    throw new ContaBloqueadaError(
      `conta temporariamente bloqueada por excesso de tentativas: tente novamente em ${restanteSegundos}s`,
    )
  }
}

export async function hasAccountConfigured(): Promise<boolean> {
  const registro = await db.configuracoes.where('chave').equals(CHAVE_SALT).first()
  return registro !== undefined
}

export async function setupAccount(
  password: string,
  opcoes: { apagandoDadosExistentes?: boolean } = {},
): Promise<{ key: CryptoKey }> {
  if (!opcoes.apagandoDadosExistentes && (await hasAccountConfigured())) {
    throw new Error(
      'já existe uma conta configurada neste dispositivo; re-chavear tornaria todo dado cifrado ' +
        'indecifrável para sempre. Use setupAccount(senha, { apagandoDadosExistentes: true }) se ' +
        'essa perda for intencional.',
    )
  }

  const saltSenha = generateSalt()
  const kekSenha = await deriveKey(password, saltSenha)

  const dek = await generateDEK()
  const dekSenhaWrapped = await wrapDEK(dek, kekSenha)
  const verificador = await encryptText(dek, TEXTO_VERIFICACAO)
  
  // Tenta salvar a chave envelopada na nuvem (para recuperação futura)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    const recoveryKek = await deriveRecoveryKEK(session.user.id)
    const dekRecoveryWrapped = await wrapDEK(dek, recoveryKek)
    
    await supabase.from('user_keys').upsert({
      user_id: session.user.id,
      wrapped_dek: dekRecoveryWrapped,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }

  await db.transaction('rw', db.configuracoes, async () => {
    await salvarConfiguracao(CHAVE_SALT, bytesToBase64(saltSenha))
    await salvarConfiguracao(CHAVE_DEK_SENHA, dekSenhaWrapped)
    await salvarConfiguracao(CHAVE_VERIFICADOR, verificador)
    await salvarConfiguracao(CHAVE_MIGRACAO_DEK, 'true')
  })

  sessionKey = dek
  await persistSessionKey(dek)
  return { key: dek }
}

export async function login(password: string): Promise<CryptoKey | null> {
  await verificarBloqueio()

  const saltRegistro = await db.configuracoes.where('chave').equals(CHAVE_SALT).first()
  const verificadorRegistro = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
  
  if (!saltRegistro) return null
  if (!verificadorRegistro) {
    throw new Error(
      'conta corrompida: existe salt mas não existe verificador. Nenhuma senha abre este banco — ' +
        'restaure um backup JSON.',
    )
  }

  const salt = base64ToBytes(saltRegistro.valor)
  const derivedKey = await deriveKey(password, salt)

  let dek: CryptoKey
  const dekSenhaRegistro = await db.configuracoes.where('chave').equals(CHAVE_DEK_SENHA).first()

  if (dekSenhaRegistro) {
    // Fluxo novo com DEK
    try {
      dek = await unwrapDEK(dekSenhaRegistro.valor, derivedKey)
      const texto = await decryptText(dek, verificadorRegistro.valor)
      if (texto !== TEXTO_VERIFICACAO) {
        await registrarTentativaFalha()
        return null
      }
    } catch {
      await registrarTentativaFalha()
      return null
    }
  } else {
    // Fluxo legado sem DEK
    try {
      const texto = await decryptText(derivedKey, verificadorRegistro.valor)
      if (texto !== TEXTO_VERIFICACAO) {
        await registrarTentativaFalha()
        return null
      }
      dek = derivedKey // A chave derivada atuava como DEK e KEK
    } catch {
      await registrarTentativaFalha()
      return null
    }
  }

  await limparTentativasFalhas()
  sessionKey = dek
  await persistSessionKey(dek)
  return dek
}

export async function isMigratedToDek(): Promise<boolean> {
  const registro = await db.configuracoes.where('chave').equals(CHAVE_MIGRACAO_DEK).first()
  return registro?.valor === 'true'
}

export async function migrarParaDek(password: string): Promise<void> {
  const isMigrated = await isMigratedToDek()
  if (isMigrated) throw new Error('Conta já migrada para novo formato')

  const saltRegistro = await db.configuracoes.where('chave').equals(CHAVE_SALT).first()
  if (!saltRegistro) throw new Error('Conta não encontrada')

  const salt = base64ToBytes(saltRegistro.valor)
  const legacyKey = await deriveKey(password, salt)

  const novoSaltSenha = generateSalt()
  const kekSenha = await deriveKey(password, novoSaltSenha)
  
  const dek = legacyKey
  const dekSenhaWrapped = await wrapDEK(dek, kekSenha)
  const verificador = await encryptText(dek, TEXTO_VERIFICACAO)
  
  // Tenta salvar na nuvem
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    const recoveryKek = await deriveRecoveryKEK(session.user.id)
    const dekRecoveryWrapped = await wrapDEK(dek, recoveryKek)
    
    await supabase.from('user_keys').upsert({
      user_id: session.user.id,
      wrapped_dek: dekRecoveryWrapped,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }

  await db.transaction('rw', db.configuracoes, async () => {
    await salvarConfiguracao(CHAVE_SALT, bytesToBase64(novoSaltSenha))
    await salvarConfiguracao(CHAVE_DEK_SENHA, dekSenhaWrapped)
    await salvarConfiguracao(CHAVE_VERIFICADOR, verificador)
    await salvarConfiguracao(CHAVE_MIGRACAO_DEK, 'true')
  })
}

export async function recuperarCofreComNuvem(novaSenha: string): Promise<CryptoKey | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error('Você precisa estar logado na nuvem para recuperar o cofre.')
  }

  // 1. Busca a chave encriptada do Supabase
  const { data: userKeys, error } = await supabase
    .from('user_keys')
    .select('wrapped_dek')
    .eq('user_id', session.user.id)
    .single()

  if (error || !userKeys?.wrapped_dek) {
    throw new Error('Chave de recuperação não encontrada na nuvem.')
  }

  // 2. Deriva a KEK de Recuperação (usando user_id + pepper local)
  const recoveryKek = await deriveRecoveryKEK(session.user.id)

  try {
    // 3. Desempacota a DEK
    const dek = await unwrapDEK(userKeys.wrapped_dek, recoveryKek)
    
    // 4. Verifica se a DEK está correta (valida o verificador local)
    const verificadorReg = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
    if (verificadorReg) {
        const texto = await decryptText(dek, verificadorReg.valor)
        if (texto !== TEXTO_VERIFICACAO) {
          throw new Error('Chave desempacotada não abre os dados locais.')
        }
    } else {
        // Se não tiver verificador, cria (pode ser o caso de device novo baixando a DEK)
        const verificador = await encryptText(dek, TEXTO_VERIFICACAO)
        await salvarConfiguracao(CHAVE_VERIFICADOR, verificador)
        await salvarConfiguracao(CHAVE_MIGRACAO_DEK, 'true')
    }

    // 5. Salva a nova Senha do Cofre no IndexedDB
    const novoSalt = generateSalt()
    const novaKek = await deriveKey(novaSenha, novoSalt)
    const dekSenhaWrapped = await wrapDEK(dek, novaKek)

    await db.transaction('rw', db.configuracoes, async () => {
      await salvarConfiguracao(CHAVE_SALT, bytesToBase64(novoSalt))
      await salvarConfiguracao(CHAVE_DEK_SENHA, dekSenhaWrapped)
    })

    sessionKey = dek
    await persistSessionKey(dek)
    return dek
  } catch (err) {
    console.error(err)
    throw new Error('Falha ao recuperar a chave a partir da nuvem.')
  }
}

export async function alterarSenha(novaSenha: string): Promise<void> {
  if (!sessionKey) throw new Error('Usuário não está logado')
  
  const novoSalt = generateSalt()
  const novaKek = await deriveKey(novaSenha, novoSalt)
  const dekSenhaWrapped = await wrapDEK(sessionKey, novaKek)
  
  await db.transaction('rw', db.configuracoes, async () => {
    await salvarConfiguracao(CHAVE_SALT, bytesToBase64(novoSalt))
    await salvarConfiguracao(CHAVE_DEK_SENHA, dekSenhaWrapped)
  })
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey
}

export function clearSession(): void {
  sessionKey = null
  try {
    localStorage.removeItem(CHAVE_LOCAL_STORAGE_SESSAO)
  } catch {
    // ignore
  }
}
