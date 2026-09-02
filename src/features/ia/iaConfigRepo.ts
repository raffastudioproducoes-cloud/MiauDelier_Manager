import { db } from '../../db/schema'
import { cifrarCampo, decifrarCampo } from '../../lib/camposCifrados'

export type Personalidade = 'tecnica' | 'acolhedora' | 'direta'

const CHAVE_CONFIG_GEMINI = 'ia.chaveGemini'
const CHAVE_CONFIG_PERSONALIDADE = 'ia.personalidade'
const PERSONALIDADE_PADRAO: Personalidade = 'tecnica'

export async function hasChaveConfigurada(): Promise<boolean> {
  const registro = await db.configuracoes.where('chave').equals(CHAVE_CONFIG_GEMINI).first()
  return registro !== undefined
}

export async function definirChaveGemini(chave: string): Promise<void> {
  const chaveCifrada = await cifrarCampo(chave)
  const existente = await db.configuracoes.where('chave').equals(CHAVE_CONFIG_GEMINI).first()
  if (existente) {
    await db.configuracoes.update(existente.id as number, { valor: chaveCifrada })
  } else {
    await db.configuracoes.add({ chave: CHAVE_CONFIG_GEMINI, valor: chaveCifrada })
  }
}

export async function obterChaveGemini(): Promise<string | null> {
  const registro = await db.configuracoes.where('chave').equals(CHAVE_CONFIG_GEMINI).first()
  if (!registro) return null
  return decifrarCampo(registro.valor)
}

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
