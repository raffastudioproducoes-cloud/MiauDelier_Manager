import { getSessionKey } from './auth'
import { encryptText, decryptText } from './crypto'

export class SessaoFechadaError extends Error {
  constructor() {
    super('sessão fechada — não é possível cifrar ou decifrar sem login')
    this.name = 'SessaoFechadaError'
  }
}

export async function cifrarCampo(valorClaro: string): Promise<string> {
  const chave = getSessionKey()
  if (!chave) throw new SessaoFechadaError()
  return encryptText(chave, valorClaro)
}

export async function decifrarCampo(valorCifrado: string): Promise<string> {
  const chave = getSessionKey()
  if (!chave) throw new SessaoFechadaError()
  return decryptText(chave, valorCifrado)
}
