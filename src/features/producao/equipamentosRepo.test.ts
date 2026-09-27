import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import {
  criarEquipamento,
  listarEquipamentos,
  atualizarEquipamento,
  excluirEquipamento,
  calcularConsumoKwh,
  calcularCustoEnergia,
} from './equipamentosRepo'

describe('repositório de equipamentos e cálculo de energia kWh', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('cadastra, lista, atualiza e exclui equipamentos', async () => {
    const id = await criarEquipamento({ nome: 'Estufa de Cura UV', potenciaWatts: 500 })
    expect(id).toBeGreaterThan(0)

    const lista = await listarEquipamentos()
    expect(lista.length).toBe(1)
    expect(lista[0].nome).toBe('Estufa de Cura UV')

    await atualizarEquipamento(id, { nome: 'Estufa de Cura UV Turbo', potenciaWatts: 750 })
    const atualizado = await db.equipamentos.get(id)
    expect(atualizado?.nome).toBe('Estufa de Cura UV Turbo')
    expect(atualizado?.potenciaWatts).toBe(750)

    await excluirEquipamento(id)
    const aposExcluir = await listarEquipamentos()
    expect(aposExcluir.length).toBe(0)
  })

  it('calcula corretamente o consumo em kWh e o custo total de energia', () => {
    const usos = [
      { equipamentoId: 1, nomeEquipamento: 'Câmara de Vácuo', potenciaWatts: 1000, minutosUso: 30 }, // 0.5 kWh
      { equipamentoId: 2, nomeEquipamento: 'Politriz Elétrica', potenciaWatts: 600, minutosUso: 60 }, // 0.6 kWh
    ]

    const consumoKwh = calcularConsumoKwh(usos)
    expect(consumoKwh).toBeCloseTo(1.1)

    const valorKwh = 0.80 // R$ 0.80 por kWh
    const custo = calcularCustoEnergia(usos, valorKwh)
    expect(custo).toBeCloseTo(0.88)
  })
})
