import { db, type Equipamento, type UsoEnergiaPeca } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export interface NovoEquipamento {
  nome: string
  potenciaWatts: number
}

export async function criarEquipamento(novo: NovoEquipamento): Promise<number> {
  const agora = new Date().toISOString()
  const id = await db.equipamentos.add({
    nome: novo.nome,
    potenciaWatts: novo.potenciaWatts,
    criadoEm: agora,
  })
  return id as number
}

export async function listarEquipamentos(): Promise<Equipamento[]> {
  return db.equipamentos.toArray()
}

export async function atualizarEquipamento(id: number, dados: NovoEquipamento): Promise<void> {
  await db.equipamentos.update(id, {
    nome: dados.nome,
    potenciaWatts: dados.potenciaWatts,
  })
}

export async function excluirEquipamento(id: number): Promise<void> {
  await db.transaction('rw', db.equipamentos, db.auditoria, async () => {
    await db.equipamentos.delete(id)
    await registrarAuditoria('equipamento', id, 'exclusao')
  })
}


export function calcularConsumoKwh(usosEnergia: UsoEnergiaPeca[]): number {
  if (!usosEnergia || usosEnergia.length === 0) return 0
  return usosEnergia.reduce((acc, uso) => {
    const kwh = (uso.potenciaWatts * uso.minutosUso) / (1000 * 60)
    return acc + kwh
  }, 0)
}

export function calcularCustoEnergia(usosEnergia: UsoEnergiaPeca[], valorKwh: number): number {
  if (!valorKwh || valorKwh <= 0) return 0
  const kwhTotal = calcularConsumoKwh(usosEnergia)
  return kwhTotal * valorKwh
}
