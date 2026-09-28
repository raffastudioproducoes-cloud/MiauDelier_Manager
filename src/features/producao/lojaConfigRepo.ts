import { db } from '../../db/schema'

const CHAVE_WHATSAPP_LOJA = 'loja.whatsapp'

export async function obterWhatsappLoja(): Promise<string> {
  const reg = await db.configuracoes.where('chave').equals(CHAVE_WHATSAPP_LOJA).first()
  return reg?.valor ?? ''
}

export async function salvarWhatsappLoja(telefone: string): Promise<void> {
  const existente = await db.configuracoes.where('chave').equals(CHAVE_WHATSAPP_LOJA).first()
  if (existente && existente.id !== undefined) {
    await db.configuracoes.update(existente.id, { valor: telefone })
  } else {
    await db.configuracoes.add({ chave: CHAVE_WHATSAPP_LOJA, valor: telefone })
  }
}
