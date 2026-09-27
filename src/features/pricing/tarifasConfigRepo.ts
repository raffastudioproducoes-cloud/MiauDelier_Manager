import { db } from '../../db/schema'

export interface TarifasConfig {
  valorHoraMaoDeObra: number
  tarifaKwh: number
  tarifaAguaM3: number
}

const CHAVE_CONFIG_VALOR_HORA = 'tarifas.valorHoraMaoDeObra'
const CHAVE_CONFIG_TARIFA_KWH = 'tarifas.tarifaKwh'
const CHAVE_CONFIG_TARIFA_AGUA_M3 = 'tarifas.tarifaAguaM3'

const VALORES_PADRAO: TarifasConfig = {
  valorHoraMaoDeObra: 25.00,
  tarifaKwh: 0.85,
  tarifaAguaM3: 15.00, // R$ 15,00 por m³ (ou R$ 0,015 por litro)
}

export async function obterTarifasConfig(): Promise<TarifasConfig> {
  const [regHora, regKwh, regAgua] = await Promise.all([
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_VALOR_HORA).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_TARIFA_KWH).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_TARIFA_AGUA_M3).first(),
  ])

  return {
    valorHoraMaoDeObra: regHora?.valor ? Number(regHora.valor) : VALORES_PADRAO.valorHoraMaoDeObra,
    tarifaKwh: regKwh?.valor ? Number(regKwh.valor) : VALORES_PADRAO.tarifaKwh,
    tarifaAguaM3: regAgua?.valor ? Number(regAgua.valor) : VALORES_PADRAO.tarifaAguaM3,
  }
}

export async function salvarTarifasConfig(tarifas: Partial<TarifasConfig>): Promise<void> {
  const atuais = await obterTarifasConfig()
  const novas = { ...atuais, ...tarifas }

  const operacoes = [
    { chave: CHAVE_CONFIG_VALOR_HORA, valor: String(novas.valorHoraMaoDeObra) },
    { chave: CHAVE_CONFIG_TARIFA_KWH, valor: String(novas.tarifaKwh) },
    { chave: CHAVE_CONFIG_TARIFA_AGUA_M3, valor: String(novas.tarifaAguaM3) },
  ]

  for (const op of operacoes) {
    const existente = await db.configuracoes.where('chave').equals(op.chave).first()
    if (existente) {
      await db.configuracoes.update(existente.id as number, { valor: op.valor })
    } else {
      await db.configuracoes.add({ chave: op.chave, valor: op.valor })
    }
  }
}
