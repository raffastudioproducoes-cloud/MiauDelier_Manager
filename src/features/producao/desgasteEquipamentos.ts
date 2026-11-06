import type { Equipamento, UsoEnergiaPeca } from '../../db/schema'

/** Taxa guardada no uso para preservar o custo histórico após alteração do equipamento. */
export type UsoComDesgaste = UsoEnergiaPeca & { custoDesgastePorHora?: number }

export function obterTaxaDesgaste(equipamento: Equipamento): number | undefined {
  const valor = equipamento.valorCompra
  const vida = equipamento.vidaUtilHoras
  if (valor === undefined || vida === undefined || !Number.isFinite(valor) || valor < 0 || !Number.isFinite(vida) || vida <= 0) return undefined
  return valor / vida
}

/** A ausência de cadastro não equivale a custo zero; é informada ao chamador. */
export function calcularDesgasteEquipamentos(usos: UsoComDesgaste[], equipamentos: Equipamento[]) {
  let custo = 0
  const semDados = new Set<string>()
  for (const uso of usos) {
    if (!Number.isFinite(uso.minutosUso) || uso.minutosUso < 0) throw new Error('Tempo de uso do equipamento inválido.')
    if (uso.minutosUso === 0) continue
    const equipamento = equipamentos.find(eq => eq.id === uso.equipamentoId)
    const taxa = uso.custoDesgastePorHora ?? (equipamento ? obterTaxaDesgaste(equipamento) : undefined)
    if (taxa === undefined || !Number.isFinite(taxa) || taxa < 0) {
      semDados.add(uso.nomeEquipamento)
      continue
    }
    custo += (uso.minutosUso / 60) * taxa
  }
  return { custo, semDados: [...semDados] }
}
