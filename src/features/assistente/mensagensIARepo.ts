import { db, type MensagemIA, type PapelMensagemIA } from '../../db/schema'

export async function criarMensagemIA(papel: PapelMensagemIA, texto: string): Promise<number> {
  const id = await db.mensagensIA.add({ papel, texto, criadoEm: new Date().toISOString() })
  return id as number
}

export async function listarMensagensIA(): Promise<MensagemIA[]> {
  return db.mensagensIA.orderBy('criadoEm').toArray()
}

export async function limparConversaIA(): Promise<void> {
  await db.mensagensIA.clear()
}
