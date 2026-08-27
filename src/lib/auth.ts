import { db } from '../db/schema'
import {
  deriveKey,
  generateSalt,
  encryptText,
  decryptText,
  bytesToBase64,
  base64ToBytes,
} from './crypto'

export const CHAVE_SALT = 'auth.salt'
export const CHAVE_VERIFICADOR = 'auth.verificador'
const TEXTO_VERIFICACAO = 'miaudelier-ok'

let sessionKey: CryptoKey | null = null

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

export async function setupAccount(
  password: string,
  opcoes: { apagandoDadosExistentes?: boolean } = {},
): Promise<CryptoKey> {
  if (!opcoes.apagandoDadosExistentes && (await hasAccountConfigured())) {
    throw new Error(
      'já existe uma conta configurada neste dispositivo; re-chavear tornaria todo dado cifrado ' +
        'indecifrável para sempre. Use setupAccount(senha, { apagandoDadosExistentes: true }) se ' +
        'essa perda for intencional.',
    )
  }

  const salt = generateSalt()
  const key = await deriveKey(password, salt)
  const verificador = await encryptText(key, TEXTO_VERIFICACAO)

  // Salt e verificador precisam nascer juntos: sem transação, uma aba fechada entre as duas
  // gravações deixaria salt sem verificador, e o app pediria "Entrar" para uma conta que
  // nenhuma senha abre — num produto sem recuperação de senha.
  await db.transaction('rw', db.configuracoes, async () => {
    await salvarConfiguracao(CHAVE_SALT, bytesToBase64(salt))
    await salvarConfiguracao(CHAVE_VERIFICADOR, verificador)
  })

  sessionKey = key
  return key
}

export async function login(password: string): Promise<CryptoKey | null> {
  const saltRegistro = await db.configuracoes.where('chave').equals(CHAVE_SALT).first()
  const verificadorRegistro = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
  if (!saltRegistro) return null
  if (!verificadorRegistro) {
    // Estado impossível de produzir via setupAccount (que grava os dois em transação): só
    // sobra banco corrompido ou editado por fora. Não é senha errada, e mentir dizendo que é
    // faria a usuária tentar senhas para sempre em vez de restaurar um backup.
    throw new Error(
      'conta corrompida: existe salt mas não existe verificador. Nenhuma senha abre este banco — ' +
        'restaure um backup JSON.',
    )
  }

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
