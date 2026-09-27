import { db } from '../../db/schema'

export interface TarifasConfig {
  valorHoraMaoDeObra: number
  tarifaKwh: number
  tarifaAguaM3: number

  // Localização Geográfica do Ateliê
  pais: string
  estado: string
  cidadeBairro: string

  // Dados das Concessionárias
  concessionariaLuz?: string
  concessionariaAgua?: string
  ultimaAtualizacaoTarifas?: string
  statusAtualizacaoTarifas?: string
}

const CHAVE_CONFIG_VALOR_HORA = 'tarifas.valorHoraMaoDeObra'
const CHAVE_CONFIG_TARIFA_KWH = 'tarifas.tarifaKwh'
const CHAVE_CONFIG_TARIFA_AGUA_M3 = 'tarifas.tarifaAguaM3'
const CHAVE_CONFIG_PAIS = 'tarifas.pais'
const CHAVE_CONFIG_ESTADO = 'tarifas.estado'
const CHAVE_CONFIG_CIDADE_BAIRRO = 'tarifas.cidadeBairro'
const CHAVE_CONFIG_CONCESSIONARIA_LUZ = 'tarifas.concessionariaLuz'
const CHAVE_CONFIG_CONCESSIONARIA_AGUA = 'tarifas.concessionariaAgua'
const CHAVE_CONFIG_ULTIMA_ATUALIZACAO = 'tarifas.ultimaAtualizacao'
const CHAVE_CONFIG_STATUS_ATUALIZACAO = 'tarifas.statusAtualizacao'

const VALORES_PADRAO: TarifasConfig = {
  valorHoraMaoDeObra: 25.00,
  tarifaKwh: 0.85,
  tarifaAguaM3: 15.00,
  pais: 'Brasil',
  estado: 'SP',
  cidadeBairro: 'São Paulo',
  concessionariaLuz: 'Enel SP',
  concessionariaAgua: 'Sabesp',
  ultimaAtualizacaoTarifas: undefined,
  statusAtualizacaoTarifas: undefined,
}

export async function obterTarifasConfig(): Promise<TarifasConfig> {
  const [
    regHora,
    regKwh,
    regAgua,
    regPais,
    regEstado,
    regCidade,
    regConcLuz,
    regConcAgua,
    regUltimaAtualizacao,
    regStatus,
  ] = await Promise.all([
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_VALOR_HORA).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_TARIFA_KWH).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_TARIFA_AGUA_M3).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_PAIS).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_ESTADO).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_CIDADE_BAIRRO).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_CONCESSIONARIA_LUZ).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_CONCESSIONARIA_AGUA).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_ULTIMA_ATUALIZACAO).first(),
    db.configuracoes.where('chave').equals(CHAVE_CONFIG_STATUS_ATUALIZACAO).first(),
  ])

  return {
    valorHoraMaoDeObra: regHora?.valor ? Number(regHora.valor) : VALORES_PADRAO.valorHoraMaoDeObra,
    tarifaKwh: regKwh?.valor ? Number(regKwh.valor) : VALORES_PADRAO.tarifaKwh,
    tarifaAguaM3: regAgua?.valor ? Number(regAgua.valor) : VALORES_PADRAO.tarifaAguaM3,
    pais: regPais?.valor || VALORES_PADRAO.pais,
    estado: regEstado?.valor || VALORES_PADRAO.estado,
    cidadeBairro: regCidade?.valor || VALORES_PADRAO.cidadeBairro,
    concessionariaLuz: regConcLuz?.valor || VALORES_PADRAO.concessionariaLuz,
    concessionariaAgua: regConcAgua?.valor || VALORES_PADRAO.concessionariaAgua,
    ultimaAtualizacaoTarifas: regUltimaAtualizacao?.valor || undefined,
    statusAtualizacaoTarifas: regStatus?.valor || undefined,
  }
}

export async function salvarTarifasConfig(tarifas: Partial<TarifasConfig>): Promise<void> {
  const atuais = await obterTarifasConfig()
  const novas = { ...atuais, ...tarifas }

  const operacoes = [
    { chave: CHAVE_CONFIG_VALOR_HORA, valor: String(novas.valorHoraMaoDeObra) },
    { chave: CHAVE_CONFIG_TARIFA_KWH, valor: String(novas.tarifaKwh) },
    { chave: CHAVE_CONFIG_TARIFA_AGUA_M3, valor: String(novas.tarifaAguaM3) },
    { chave: CHAVE_CONFIG_PAIS, valor: novas.pais },
    { chave: CHAVE_CONFIG_ESTADO, valor: novas.estado },
    { chave: CHAVE_CONFIG_CIDADE_BAIRRO, valor: novas.cidadeBairro },
    { chave: CHAVE_CONFIG_CONCESSIONARIA_LUZ, valor: novas.concessionariaLuz || '' },
    { chave: CHAVE_CONFIG_CONCESSIONARIA_AGUA, valor: novas.concessionariaAgua || '' },
    { chave: CHAVE_CONFIG_ULTIMA_ATUALIZACAO, valor: novas.ultimaAtualizacaoTarifas || '' },
    { chave: CHAVE_CONFIG_STATUS_ATUALIZACAO, valor: novas.statusAtualizacaoTarifas || '' },
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
