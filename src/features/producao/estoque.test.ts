import { describe, expect, it } from 'vitest'
import { siliconeEstoqueParaKg, siliconeKgParaEstoque } from './estoque'

describe('conversão de silicone para a unidade do estoque', () => {
  it('converte kg para gramas e litros usando a densidade', () => {
    expect(siliconeKgParaEstoque(2.2, 'g', 1.1)).toBeCloseTo(2200)
    expect(siliconeKgParaEstoque(2.2, 'l', 1.1)).toBeCloseTo(2)
    expect(siliconeEstoqueParaKg(2000, 'ml', 1.1)).toBeCloseTo(2.2)
    expect(siliconeKgParaEstoque(2, 'un', 1.1)).toBeNull()
  })
})
