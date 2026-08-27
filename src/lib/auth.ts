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
const CHAVE_TENTATIVAS_FALHAS = 'auth.tentativasFalhas'
const CHAVE_BLOQUEADO_ATE = 'auth.bloqueadoAte'
const TEXTO_VERIFICACAO = 'miaudelier-ok'

const MAX_TENTATIVAS = 5
const BLOQUEIO_BASE_MS = 30_000
const BLOQUEIO_MAX_MS = 15 * 60_000

let sessionKey: CryptoKey | null = null

export class ContaBloqueadaError extends Error {}

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
  // Bloqueio verificado ANTES de qualquer tentativa de decifrar — mesmo com a senha certa, uma
  // conta bloqueada por excesso de tentativas erradas não abre até o tempo de espera passar.
  await verificarBloqueio()

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
    if (texto !== TEXTO_VERIFICACAO) {
      await registrarTentativaFalha()
      return null
    }
  } catch {
    await registrarTentativaFalha()
    return null
  }

  await limparTentativasFalhas()
  sessionKey = key
  return key
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey
}

export function clearSession(): void {
  sessionKey = null
}
