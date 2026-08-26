import { describe, it, expect } from 'vitest'
import { calcularPrecificacao } from './pricing'

describe('motor de precificação', () => {
  it('bate com o exemplo do guia de referência', () => {
    const resultado = calcularPrecificacao({
      custoMaterial: 25,
      custoAcessorios: 5,
      horasProducao: 1.5,
      valorHora: 20,
      rateioFixoPercent: 15,
      margemLucroPercent: 40,
    })

    expect(resultado.custoDireto).toBe(30)
    expect(resultado.custoMaoDeObra).toBe(30)
    expect(resultado.subtotal).toBe(60)
    expect(resultado.custoFixo).toBeCloseTo(9, 5)
    expect(resultado.custoTotal).toBeCloseTo(69, 5)
    expect(resultado.lucro).toBeCloseTo(27.6, 5)
    expect(resultado.precoFinal).toBeCloseTo(96.6, 5)
  })

  it('zera custos quando todos os inputs são zero', () => {
    const resultado = calcularPrecificacao({
      custoMaterial: 0,
      custoAcessorios: 0,
      horasProducao: 0,
      valorHora: 0,
      rateioFixoPercent: 0,
      margemLucroPercent: 0,
    })
    expect(resultado.precoFinal).toBe(0)
  })
})
