export interface UsoEnergiaItem {
  nomeEquipamento?: string
  potenciaWatts: number
  minutosUso: number
}

export interface PrecificacaoInput {
  custoMaterial: number
  custoAcessorios: number
  custoEmbalagem?: number
  horasProducao: number
  valorHora: number
  rateioFixoPercent: number
  margemLucroPercent: number
  custoEnergia?: number
  usosEnergia?: UsoEnergiaItem[]
  tarifaKwh?: number
  custoAgua?: number
  litrosAgua?: number
  tarifaAguaPorLitro?: number
  custoForma?: number
  percentualDesperdicio?: number
  percentualTaxas?: number
  taxaFixa?: number
}

export interface PrecificacaoResultado {
  custoMaterial: number
  custoAcessorios: number
  custoEmbalagem: number
  custoDesperdicio: number
  custoEnergia: number
  custoAgua: number
  custoForma: number
  custoDireto: number
  custoMaoDeObra: number
  subtotal: number
  custoFixo: number
  custoTotal: number
  lucro: number
  taxaMarketplace: number
  precoFinal: number
}

function validarNaoNegativoFinito(nome: string, valor: number): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${nome} inválido: deve ser um número finito e não-negativo (recebido: ${valor})`)
  }
}

export function calcularPrecificacao(input: PrecificacaoInput): PrecificacaoResultado {
  validarNaoNegativoFinito('custoMaterial', input.custoMaterial)
  validarNaoNegativoFinito('custoAcessorios', input.custoAcessorios)
  validarNaoNegativoFinito('horasProducao', input.horasProducao)
  validarNaoNegativoFinito('valorHora', input.valorHora)

  const custoEmbalagem = input.custoEmbalagem ?? 0
  const custoForma = input.custoForma ?? 0
  const percentualDesperdicio = input.percentualDesperdicio ?? 0
  const percentualTaxas = input.percentualTaxas ?? 0
  const taxaFixa = input.taxaFixa ?? 0

  validarNaoNegativoFinito('custoEmbalagem', custoEmbalagem)
  validarNaoNegativoFinito('custoForma', custoForma)
  validarNaoNegativoFinito('percentualDesperdicio', percentualDesperdicio)
  validarNaoNegativoFinito('percentualTaxas', percentualTaxas)
  validarNaoNegativoFinito('taxaFixa', taxaFixa)

  // Cálculo de Energia Elétrica (Luz)
  let custoEnergiaCalculado = 0
  if (input.usosEnergia && input.usosEnergia.length > 0) {
    const tarifa = input.tarifaKwh && input.tarifaKwh > 0 ? input.tarifaKwh : 0.85
    for (const uso of input.usosEnergia) {
      const watts = Math.max(0, uso.potenciaWatts || 0)
      const minutos = Math.max(0, uso.minutosUso || 0)
      const kwh = (watts / 1000) * (minutos / 60)
      custoEnergiaCalculado += kwh * tarifa
    }
  }
  const custoEnergia = Math.max(input.custoEnergia ?? 0, custoEnergiaCalculado)
  validarNaoNegativoFinito('custoEnergia', custoEnergia)

  // Cálculo de Consumo de Água
  let custoAguaCalculado = 0
  if (typeof input.litrosAgua === 'number' && input.litrosAgua > 0) {
    const tarifaAgua = input.tarifaAguaPorLitro && input.tarifaAguaPorLitro > 0 ? input.tarifaAguaPorLitro : 0.015
    custoAguaCalculado = input.litrosAgua * tarifaAgua
  }
  const custoAgua = Math.max(input.custoAgua ?? 0, custoAguaCalculado)
  validarNaoNegativoFinito('custoAgua', custoAgua)

  if (!Number.isFinite(input.rateioFixoPercent) || input.rateioFixoPercent < 0 || input.rateioFixoPercent > 100) {
    throw new Error(`rateioFixoPercent inválido: deve estar entre 0 e 100 (recebido: ${input.rateioFixoPercent})`)
  }
  if (!Number.isFinite(input.margemLucroPercent) || input.margemLucroPercent < 0 || input.margemLucroPercent > 1000) {
    throw new Error(`margemLucroPercent inválido: deve estar entre 0 e 1000 (recebido: ${input.margemLucroPercent})`)
  }

  const custoDesperdicio = input.custoMaterial * (percentualDesperdicio / 100)
  const custoDireto = input.custoMaterial + input.custoAcessorios + custoEmbalagem + custoDesperdicio + custoEnergia + custoAgua + custoForma
  const custoMaoDeObra = input.horasProducao * input.valorHora
  const subtotal = custoDireto + custoMaoDeObra
  const custoFixo = subtotal * (input.rateioFixoPercent / 100)
  const custoTotal = subtotal + custoFixo

  let precoFinal: number
  let lucro: number
  let taxaMarketplace: number

  if (percentualTaxas > 0) {
    const taxasEMargemDec = (percentualTaxas + input.margemLucroPercent) / 100
    const divisor = 1 - taxasEMargemDec
    precoFinal = divisor > 0.01 ? (custoTotal + taxaFixa) / divisor : custoTotal + taxaFixa
    taxaMarketplace = precoFinal * (percentualTaxas / 100) + taxaFixa
    lucro = precoFinal - custoTotal - taxaMarketplace
  } else {
    lucro = custoTotal * (input.margemLucroPercent / 100)
    precoFinal = custoTotal + lucro + taxaFixa
    taxaMarketplace = taxaFixa
  }

  return {
    custoMaterial: input.custoMaterial,
    custoAcessorios: input.custoAcessorios,
    custoEmbalagem,
    custoDesperdicio,
    custoEnergia,
    custoAgua,
    custoForma,
    custoDireto,
    custoMaoDeObra,
    subtotal,
    custoFixo,
    custoTotal,
    lucro,
    taxaMarketplace,
    precoFinal,
  }
}
