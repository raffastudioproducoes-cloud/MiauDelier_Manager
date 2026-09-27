import { describe, it, expect } from 'vitest'
import { converterQuantidade, ehIncompativel, obterOpcoesUnidadeCompativeis } from './unidades'

describe('utilitário de unidades de medida', () => {
  it('converte litros para mililitros', () => {
    const { quantidadeConvertida } = converterQuantidade(0.2, 'l', 'ml')
    expect(quantidadeConvertida).toBeCloseTo(200)
  })

  it('converte mililitros para litros', () => {
    const { quantidadeConvertida } = converterQuantidade(200, 'ml', 'l')
    expect(quantidadeConvertida).toBeCloseTo(0.2)
  })

  it('converte kg para gramas', () => {
    const { quantidadeConvertida } = converterQuantidade(0.5, 'kg', 'g')
    expect(quantidadeConvertida).toBeCloseTo(500)
  })

  it('converte gramas para kg', () => {
    const { quantidadeConvertida } = converterQuantidade(250, 'g', 'kg')
    expect(quantidadeConvertida).toBeCloseTo(0.25)
  })

  it('converte metros para centímetros', () => {
    const { quantidadeConvertida } = converterQuantidade(1.5, 'm', 'cm')
    expect(quantidadeConvertida).toBeCloseTo(150)
  })

  it('retorna a mesma quantidade para unidades iguais', () => {
    const { quantidadeConvertida } = converterQuantidade(10, 'un', 'un')
    expect(quantidadeConvertida).toBe(10)
  })

  it('detecta incompatibilidade entre grupos diferentes', () => {
    expect(ehIncompativel('kg', 'ml')).toBe(true)
    expect(ehIncompativel('l', 'g')).toBe(true)
    expect(ehIncompativel('ml', 'l')).toBe(false)
    expect(ehIncompativel('g', 'kg')).toBe(false)
  })

  it('retorna opções compatíveis para unidade base', () => {
    expect(obterOpcoesUnidadeCompativeis('ml')).toEqual(['ml', 'l'])
    expect(obterOpcoesUnidadeCompativeis('kg')).toEqual(['g', 'kg'])
    expect(obterOpcoesUnidadeCompativeis('un')).toEqual(['un'])
  })
})
