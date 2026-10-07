import { db } from '../../db/schema'

export type Personalidade = 'tecnica' | 'acolhedora' | 'direta'

const CHAVE_CONFIG_PERSONALIDADE = 'ia.personalidade'
const PERSONALIDADE_PADRAO: Personalidade = 'tecnica'

export async function definirPersonalidade(personalidade: Personalidade): Promise<void> {
  const existente = await db.configuracoes.where('chave').equals(CHAVE_CONFIG_PERSONALIDADE).first()
  if (existente) {
    await db.configuracoes.update(existente.id as number, { valor: personalidade })
  } else {
    await db.configuracoes.add({ chave: CHAVE_CONFIG_PERSONALIDADE, valor: personalidade })
  }
}

export async function obterPersonalidade(): Promise<Personalidade> {
  const registro = await db.configuracoes.where('chave').equals(CHAVE_CONFIG_PERSONALIDADE).first()
  return (registro?.valor as Personalidade | undefined) ?? PERSONALIDADE_PADRAO
}
