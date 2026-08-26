import { describe, it, expect } from 'vitest'
import { calcularVolumeMl, calcularProporcaoMistura } from './volume'

describe('calculadora de volume', () => {
  it('calcula volume retangular sem margem', () => {
    const volume = calcularVolumeMl({ geometria: 'retangular', comprimento: 10, largura: 10, profundidade: 2 })
    expect(volume).toBe(200)
  })

  it('calcula volume retangular com margem de 10%', () => {
    const volume = calcularVolumeMl(
      { geometria: 'retangular', comprimento: 10, largura: 10, profundidade: 2 },
      { margemSeguranca: true },
    )
    expect(volume).toBeCloseTo(220, 5)
  })

  it('calcula volume cilíndrico', () => {
    const volume = calcularVolumeMl({ geometria: 'cilindrico', raio: 5, altura: 3 })
    expect(volume).toBeCloseTo(Math.PI * 25 * 3, 5)
  })

  it('calcula volume esférico', () => {
    const volume = calcularVolumeMl({ geometria: 'esferico', raio: 4 })
    expect(volume).toBeCloseTo((4 / 3) * Math.PI * 64, 5)
  })

  it('aceita volume direto', () => {
    const volume = calcularVolumeMl({ geometria: 'direto', volumeMl: 150 })
    expect(volume).toBe(150)
  })

  it('calcula proporção 2:1', () => {
    const { parteA, parteB } = calcularProporcaoMistura(300, '2:1')
    expect(parteA).toBeCloseTo(200, 5)
    expect(parteB).toBeCloseTo(100, 5)
  })

  it('calcula proporção 100:3 (silicone condensação)', () => {
    const { parteA, parteB } = calcularProporcaoMistura(1000, '100:3')
    expect(parteA).toBe(1000)
    expect(parteB).toBeCloseTo(30, 5)
  })
})
