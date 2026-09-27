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

  it('calcula custo com desperdício de material, energia elétrica e taxas de marketplace', () => {
    const resultado = calcularPrecificacao({
      custoMaterial: 100,
      custoAcessorios: 10,
      horasProducao: 1,
      valorHora: 20,
      rateioFixoPercent: 10,
      margemLucroPercent: 30,
      custoEnergia: 5,            // R$ 5 em energia
      percentualDesperdicio: 10,  // 10% de perda no copo (R$ 10)
      percentualTaxas: 14,        // 14% comissão Shopee
      taxaFixa: 3.0,              // R$ 3,00 taxa fixa
    })

    // custoMaterial(100) + custoAcessorios(10) + desperdicio(10) + energia(5) = 125
    expect(resultado.custoDesperdicio).toBe(10)
    expect(resultado.custoEnergia).toBe(5)
    expect(resultado.custoDireto).toBe(125)
    expect(resultado.custoMaoDeObra).toBe(20)
    expect(resultado.subtotal).toBe(145)
    expect(resultado.custoFixo).toBeCloseTo(14.5)
    expect(resultado.custoTotal).toBeCloseTo(159.5)

    // Preço Ideal = (159.5 + 3) / (1 - (0.14 + 0.30)) = 162.5 / 0.56 = 290.1785
    expect(resultado.precoFinal).toBeCloseTo(290.178, 2)
  })

  const base = {
    custoMaterial: 25,
    custoAcessorios: 5,
    horasProducao: 1.5,
    valorHora: 20,
    rateioFixoPercent: 15,
    margemLucroPercent: 40,
  }

  it('lança se um custo for negativo', () => {
    expect(() => calcularPrecificacao({ ...base, custoMaterial: -1 })).toThrow(/inválido/i)
  })

  it('lança se um custo for NaN', () => {
    expect(() => calcularPrecificacao({ ...base, valorHora: NaN })).toThrow(/inválido/i)
  })

  it('lança se um custo for Infinity', () => {
    expect(() => calcularPrecificacao({ ...base, horasProducao: Infinity })).toThrow(/inválido/i)
  })

  it('lança se rateioFixoPercent estiver fora de 0-100', () => {
    expect(() => calcularPrecificacao({ ...base, rateioFixoPercent: -1 })).toThrow(/rateioFixoPercent/i)
    expect(() => calcularPrecificacao({ ...base, rateioFixoPercent: 101 })).toThrow(/rateioFixoPercent/i)
  })

  it('lança se margemLucroPercent estiver fora de 0-1000', () => {
    expect(() => calcularPrecificacao({ ...base, margemLucroPercent: -1 })).toThrow(/margemLucroPercent/i)
    expect(() => calcularPrecificacao({ ...base, margemLucroPercent: 1001 })).toThrow(/margemLucroPercent/i)
  })
})
