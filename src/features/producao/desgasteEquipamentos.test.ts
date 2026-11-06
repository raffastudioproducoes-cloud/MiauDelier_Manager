import { describe, expect, it } from 'vitest'
import { calcularDesgasteEquipamentos, obterTaxaDesgaste } from './desgasteEquipamentos'
import type { Equipamento } from '../../db/schema'

const politriz: Equipamento = { id: 1, nome: 'Politriz', potenciaWatts: 600, valorCompra: 600, vidaUtilHoras: 300, criadoEm: '2026-01-01' }
const uso = { equipamentoId: 1, nomeEquipamento: 'Politriz', potenciaWatts: 600, minutosUso: 90 }

describe('desgaste de equipamentos', () => {
  it('calcula taxa e custo proporcional ao tempo, inclusive em linhas repetidas', () => {
    expect(obterTaxaDesgaste(politriz)).toBe(2)
    expect(calcularDesgasteEquipamentos([uso, { ...uso, minutosUso: 30 }], [politriz])).toEqual({ custo: 4, semDados: [] })
  })

  it('preserva uma taxa histórica quando o custo de aquisição muda ou o equipamento é excluído', () => {
    expect(calcularDesgasteEquipamentos([{ ...uso, custoDesgastePorHora: 2 }], [{ ...politriz, valorCompra: 900 }]).custo).toBe(3)
    expect(calcularDesgasteEquipamentos([{ ...uso, custoDesgastePorHora: 2 }], []).custo).toBe(3)
  })

  it('sinaliza ausência de dados ao invés de apresentar custo zero como completo', () => {
    expect(calcularDesgasteEquipamentos([uso, uso], [{ ...politriz, vidaUtilHoras: undefined }])).toEqual({ custo: 0, semDados: ['Politriz'] })
    expect(calcularDesgasteEquipamentos([uso], [])).toEqual({ custo: 0, semDados: ['Politriz'] })
  })

  it('rejeita tempo inválido', () => {
    expect(() => calcularDesgasteEquipamentos([{ ...uso, minutosUso: -1 }], [politriz])).toThrow(/inválido/i)
  })
})
