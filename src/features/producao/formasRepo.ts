import { db, type Forma } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export type NovaForma = Omit<Forma, 'id'>

export async function criarForma(nova: NovaForma): Promise<number> {
  return db.transaction('rw', db.formas, db.materiais, async () => {
    let custoCalc = nova.custoFabricacao

    if (nova.materialSiliconeId && nova.quantidadeSiliconeUsada && nova.quantidadeSiliconeUsada > 0) {
      const materialSilicone = await db.materiais.get(nova.materialSiliconeId)
      if (materialSilicone) {
        if (nova.quantidadeSiliconeUsada > materialSilicone.quantidadeEstoque) {
          throw new Error(
            `Estoque insuficiente de silicone "${materialSilicone.nome}": disponível ${materialSilicone.quantidadeEstoque}, solicitado ${nova.quantidadeSiliconeUsada}`,
          )
        }
        await db.materiais.update(nova.materialSiliconeId, {
          quantidadeEstoque: materialSilicone.quantidadeEstoque - nova.quantidadeSiliconeUsada,
        })
        if (!custoCalc || custoCalc <= 0) {
          custoCalc = nova.quantidadeSiliconeUsada * materialSilicone.custoUnitario
        }
      }
    }

    const id = await db.formas.add({
      ...nova,
      custoFabricacao: custoCalc,
      usosRealizados: nova.usosRealizados ?? 0,
    })
    return id as number
  })
}


export async function listarFormas(): Promise<Forma[]> {
  return db.formas.toArray()
}

export async function atualizarForma(formaId: number, dados: NovaForma): Promise<void> {
  await db.formas.update(formaId, dados)
}

export async function excluirForma(formaId: number): Promise<void> {
  await db.transaction('rw', db.formas, db.auditoria, async () => {
    await db.formas.delete(formaId)
    await registrarAuditoria('forma', formaId)
  })
}
