import { db } from '../db/schema'
import { deriveKey, generateSalt, encryptText, decryptText } from './crypto'

const CHAVE_SALT = 'auth.salt'
const CHAVE_VERIFICADOR = 'auth.verificador'
const TEXTO_VERIFICACAO = 'miaudelier-ok'

let sessionKey: CryptoKey | null = null

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

async function salvarConfiguracao(chave: string, valor: string): Promise<void> {
  const registro = await db.configuracoes.where('chave').equals(chave).first()
  if (registro) {
    await db.configuracoes.update(registro.id!, { valor })
  } else {
    await db.configuracoes.add({ chave, valor })
  }
}

export async function hasAccountConfigured(): Promise<boolean> {
  const registro = await db.configuracoes.where('chave').equals(CHAVE_SALT).first()
  return registro !== undefined
}

export async function setupAccount(password: string): Promise<CryptoKey> {
  const salt = generateSalt()
  const key = await deriveKey(password, salt)
  const verificador = await encryptText(key, TEXTO_VERIFICACAO)

  await salvarConfiguracao(CHAVE_SALT, bytesToBase64(salt))
  await salvarConfiguracao(CHAVE_VERIFICADOR, verificador)

  sessionKey = key
  return key
}

export async function login(password: string): Promise<CryptoKey | null> {
  const saltRegistro = await db.configuracoes.where('chave').equals(CHAVE_SALT).first()
  const verificadorRegistro = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
  if (!saltRegistro || !verificadorRegistro) return null

  const salt = base64ToBytes(saltRegistro.valor)
  const key = await deriveKey(password, salt)

  try {
    const texto = await decryptText(key, verificadorRegistro.valor)
    if (texto !== TEXTO_VERIFICACAO) return null
  } catch {
    return null
  }

  sessionKey = key
  return key
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey
}

export function clearSession(): void {
  sessionKey = null
}
