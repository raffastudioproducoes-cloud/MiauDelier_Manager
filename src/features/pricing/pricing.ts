export interface PrecificacaoInput {
  custoMaterial: number
  custoAcessorios: number
  horasProducao: number
  valorHora: number
  rateioFixoPercent: number
  margemLucroPercent: number
}

export interface PrecificacaoResultado {
  custoDireto: number
  custoMaoDeObra: number
  subtotal: number
  custoFixo: number
  custoTotal: number
  lucro: number
  precoFinal: number
}

export function calcularPrecificacao(input: PrecificacaoInput): PrecificacaoResultado {
  const custoDireto = input.custoMaterial + input.custoAcessorios
  const custoMaoDeObra = input.horasProducao * input.valorHora
  const subtotal = custoDireto + custoMaoDeObra
  const custoFixo = subtotal * (input.rateioFixoPercent / 100)
  const custoTotal = subtotal + custoFixo
  const lucro = custoTotal * (input.margemLucroPercent / 100)
  const precoFinal = custoTotal + lucro

  return { custoDireto, custoMaoDeObra, subtotal, custoFixo, custoTotal, lucro, precoFinal }
}
