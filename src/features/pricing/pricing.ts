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
  if (!Number.isFinite(input.rateioFixoPercent) || input.rateioFixoPercent < 0 || input.rateioFixoPercent > 100) {
    throw new Error(`rateioFixoPercent inválido: deve estar entre 0 e 100 (recebido: ${input.rateioFixoPercent})`)
  }
  if (!Number.isFinite(input.margemLucroPercent) || input.margemLucroPercent < 0 || input.margemLucroPercent > 1000) {
    throw new Error(`margemLucroPercent inválido: deve estar entre 0 e 1000 (recebido: ${input.margemLucroPercent})`)
  }

  const custoDireto = input.custoMaterial + input.custoAcessorios
  const custoMaoDeObra = input.horasProducao * input.valorHora
  const subtotal = custoDireto + custoMaoDeObra
  const custoFixo = subtotal * (input.rateioFixoPercent / 100)
  const custoTotal = subtotal + custoFixo
  const lucro = custoTotal * (input.margemLucroPercent / 100)
  const precoFinal = custoTotal + lucro

  return { custoDireto, custoMaoDeObra, subtotal, custoFixo, custoTotal, lucro, precoFinal }
}
