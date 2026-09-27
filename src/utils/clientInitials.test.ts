import { describe, it, expect } from 'vitest'
import { iniciais } from './clientInitials'

describe('iniciais', () => {
  it('retorna a inicial maiúscula de um nome simples', () => {
    expect(iniciais('Rafa')).toBe('R')
  })

  it('retorna as duas iniciais de um nome composto', () => {
    expect(iniciais('João Silva')).toBe('JS')
  })

  it('usa as duas primeiras palavras não vazias quando há mais de duas', () => {
    expect(iniciais('João da Silva Santos')).toBe('JD')
  })

  it('preserva acentos e caracteres não ASCII no corte', () => {
    expect(iniciais('Maria José')).toBe('MJ')
    expect(iniciais('Luís Antônio')).toBe('LA')
  })

  it('retorna string vazia para entrada vazia ou só espaços', () => {
    expect(iniciais('')).toBe('')
    expect(iniciais('   ')).toBe('')
  })

  it('ignora espaços extras entre as palavras', () => {
    expect(iniciais('  Ana   Maria  ')).toBe('AM')
  })
})
