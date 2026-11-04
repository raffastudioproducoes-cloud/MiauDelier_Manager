import { describe, expect, it } from 'vitest'

describe('calcularVolumeSiliconeMolde', () => {
  it('inclui no silicone os furos vazados da mesa', async () => {
    const { calcularVolumeSiliconeMolde } = await import('./volume')
    const resultado = calcularVolumeSiliconeMolde({
      caixaInternaCm: { comprimento: 20, largura: 15, altura: 10 },
      tampoMesaCm: { comprimento: 10, largura: 8, espessura: 2 },
      furosVazados: [{ quantidade: 2, geometria: 'circulo', diametroCm: 2, profundidadeCm: 2 }],
      densidadeSiliconeGcm3: 1.1,
    })

    const madeiraTampo = 10 * 8 * 2
    const volumeFuros = 2 * Math.PI * 1 ** 2 * 2
    const siliconeLiquido = 20 * 15 * 10 - (madeiraTampo - volumeFuros)
    expect(resultado.volumeTampoMadeiraCm3).toBeCloseTo(madeiraTampo)
    expect(resultado.volumeFurosCm3).toBeCloseTo(volumeFuros)
    expect(resultado.volumeLiquidoCm3).toBeCloseTo(siliconeLiquido)
    expect(resultado.volumeMinimoLitros).toBeCloseTo(siliconeLiquido * 1.08 / 1000)
    expect(resultado.volumeMaximoLitros).toBeCloseTo(siliconeLiquido * 1.12 / 1000)
    expect(resultado.massaMinimaKg).toBeCloseTo(siliconeLiquido * 1.08 / 1000 * 1.1)
    expect(resultado.massaMaximaKg).toBeCloseTo(siliconeLiquido * 1.12 / 1000 * 1.1)
  })

  it('calcula a mesa de 55,5 × 66,5 × 3 cm com 10 furos vazados de 11 cm', async () => {
    const { calcularVolumeSiliconeMolde } = await import('./volume')
    const resultado = calcularVolumeSiliconeMolde({
      caixaInternaCm: { comprimento: 60, largura: 71, altura: 5 },
      tampoMesaCm: { comprimento: 55.5, largura: 66.5, espessura: 3 },
      furosVazados: [{ quantidade: 10, geometria: 'circulo', diametroCm: 11 }],
      densidadeSiliconeGcm3: 1.1,
    })
    const furos = 10 * Math.PI * 5.5 ** 2 * 3
    const volume = 60 * 71 * 5 - (55.5 * 66.5 * 3 - furos)
    expect(resultado.volumeLiquidoCm3).toBeCloseTo(volume)
    expect(resultado.massaMinimaKg).toBeCloseTo(volume * 1.08 / 1000 * 1.1)
    expect(resultado.massaMaximaKg).toBeCloseTo(volume * 1.12 / 1000 * 1.1)
  })

  it('aceita furo retangular usando profundidade padrão igual à espessura do tampo', async () => {
    const { calcularVolumeSiliconeMolde } = await import('./volume')
    const resultado = calcularVolumeSiliconeMolde({
      caixaInternaCm: { comprimento: 20, largura: 15, altura: 10 },
      tampoMesaCm: { comprimento: 10, largura: 8, espessura: 2 },
      furosVazados: [{ quantidade: 1, geometria: 'retangulo', comprimentoCm: 2, larguraCm: 3 }],
      densidadeSiliconeGcm3: 1,
    })

    expect(resultado.volumeFurosCm3).toBe(12)
  })

  it('considera o furo atravessando toda a tábua mesmo com outra profundidade de resina', async () => {
    const { calcularVolumeSiliconeMolde } = await import('./volume')
    const resultado = calcularVolumeSiliconeMolde({
      caixaInternaCm: { comprimento: 20, largura: 15, altura: 10 },
      tampoMesaCm: { comprimento: 10, largura: 8, espessura: 2 },
      furosVazados: [{ quantidade: 1, geometria: 'circulo', diametroCm: 2, profundidadeCm: 1 }],
      densidadeSiliconeGcm3: 1,
    })
    expect(resultado.volumeFurosCm3).toBeCloseTo(Math.PI * 2)
  })

  it('rejeita caixa ou densidade não positivas, furos inválidos, volumes não finitos e encaixe impossível', async () => {
    const { calcularVolumeSiliconeMolde } = await import('./volume')
    const base = {
      caixaInternaCm: { comprimento: 20, largura: 15, altura: 10 },
      tampoMesaCm: { comprimento: 10, largura: 8, espessura: 2 },
      densidadeSiliconeGcm3: 1.1,
    }

    expect(() => calcularVolumeSiliconeMolde({ ...base, densidadeSiliconeGcm3: 0 })).toThrow()
    expect(() => calcularVolumeSiliconeMolde({ ...base, caixaInternaCm: { comprimento: 0, largura: 15, altura: 10 } })).toThrow()
    expect(() => calcularVolumeSiliconeMolde({ ...base, caixaInternaCm: { comprimento: 9, largura: 15, altura: 10 } })).toThrow()
    expect(() => calcularVolumeSiliconeMolde({ ...base, furosVazados: [{ quantidade: -1, diametroCm: 2 }] })).toThrow()
    expect(() => calcularVolumeSiliconeMolde({ ...base, furosVazados: [{ quantidade: 1, diametroCm: 9 }] })).toThrow(/diâmetro/i)
    expect(() => calcularVolumeSiliconeMolde({ ...base, furosVazados: [{ quantidade: 1, diametroCm: 2, profundidadeCm: 3 }] })).toThrow(/profundidade/i)
    expect(() => calcularVolumeSiliconeMolde({
      ...base,
      caixaInternaCm: { comprimento: 1e200, largura: 1e200, altura: 1e200 },
    })).toThrow()
    expect(() => calcularVolumeSiliconeMolde({
      ...base,
      caixaInternaCm: { comprimento: 10, largura: 8, altura: 2 },
      tampoMesaCm: { comprimento: 10, largura: 8, espessura: 2 },
      furosVazados: [{ quantidade: 100, diametroCm: 2, profundidadeCm: 2 }],
    })).toThrow()
  })
})

describe('parseNumeroPtBr', () => {
  it.each([
    ['10,5', 10.5],
    ['1.234,5', 1234.5],
    ['10.5', 10.5],
  ])('converte %s para decimal', async (texto, esperado) => {
    const { parseNumeroPtBr } = await import('./volume')
    expect(parseNumeroPtBr(texto)).toBe(esperado)
  })

  it.each(['', '1,2.3', '1,2,3', 'NaN', 'Infinity'])('retorna null para entrada inválida %s', async (texto) => {
    const { parseNumeroPtBr } = await import('./volume')
    expect(parseNumeroPtBr(texto)).toBeNull()
  })
})
