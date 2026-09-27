export interface PrecificacaoInput {
  custoMaterial: number
  custoAcessorios: number
  horasProducao: number
  valorHora: number
  rateioFixoPercent: number
  margemLucroPercent: number
  custoEnergia?: number
  percentualDesperdicio?: number
  percentualTaxas?: number
  taxaFixa?: number
}

export interface PrecificacaoResultado {
  custoDireto: number
  custoDesperdicio: number
  custoEnergia: number
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

  const custoEnergia = input.custoEnergia ?? 0
  const percentualDesperdicio = input.percentualDesperdicio ?? 0
  const percentualTaxas = input.percentualTaxas ?? 0
  const taxaFixa = input.taxaFixa ?? 0

  validarNaoNegativoFinito('custoEnergia', custoEnergia)
  validarNaoNegativoFinito('percentualDesperdicio', percentualDesperdicio)
  validarNaoNegativoFinito('percentualTaxas', percentualTaxas)
  validarNaoNegativoFinito('taxaFixa', taxaFixa)

  if (!Number.isFinite(input.rateioFixoPercent) || input.rateioFixoPercent < 0 || input.rateioFixoPercent > 100) {
    throw new Error(`rateioFixoPercent inválido: deve estar entre 0 e 100 (recebido: ${input.rateioFixoPercent})`)
  }
  if (!Number.isFinite(input.margemLucroPercent) || input.margemLucroPercent < 0 || input.margemLucroPercent > 1000) {
    throw new Error(`margemLucroPercent inválido: deve estar entre 0 e 1000 (recebido: ${input.margemLucroPercent})`)
  }

  const custoDesperdicio = input.custoMaterial * (percentualDesperdicio / 100)
  const custoDireto = input.custoMaterial + input.custoAcessorios + custoDesperdicio + custoEnergia
  const custoMaoDeObra = input.horasProducao * input.valorHora
  const subtotal = custoDireto + custoMaoDeObra
  const custoFixo = subtotal * (input.rateioFixoPercent / 100)
  const custoTotal = subtotal + custoFixo

  let precoFinal = 0
  let lucro = 0
  let taxaMarketplace = 0

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
    custoDireto,
    custoDesperdicio,
    custoEnergia,
    custoMaoDeObra,
    subtotal,
    custoFixo,
    custoTotal,
    lucro,
    taxaMarketplace,
    precoFinal,
  }
}
