import { db, type Forma } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export type NovaForma = Omit<Forma, 'id'>

export async function criarForma(nova: NovaForma): Promise<number> {
  return db.transaction('rw', db.formas, db.materiais, db.notificacoes, async () => {
    let custoCalc = nova.custoFabricacao
    const agoraMs = Date.now()

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

    const ehCurando = typeof nova.curaMinutos === 'number' && nova.curaMinutos > 0
    const statusFinal = nova.status ?? (ehCurando ? 'curando' : 'pronta')
    const curaIniciadaEm = ehCurando ? (nova.curaIniciadaEm ?? agoraMs) : undefined

    const id = (await db.formas.add({
      ...nova,
      custoFabricacao: custoCalc,
      usosRealizados: nova.usosRealizados ?? 0,
      status: statusFinal,
      curaIniciadaEm,
    })) as number

    if (ehCurando) {
      const horas = (nova.curaMinutos! / 60).toFixed(1)
      await db.notificacoes.add({
        titulo: 'Molde em Cura Iniciada',
        mensagem: `O molde "${nova.nome}" entrou em processo de cura (${horas}h).`,
        lida: false,
        criadoEm: new Date().toISOString(),
      })
    }

    return id
  })
}

export async function finalizarCuraForma(formaId: number): Promise<void> {
  await db.transaction('rw', db.formas, db.notificacoes, async () => {
    const forma = await db.formas.get(formaId)
    if (!forma) throw new Error('Forma não encontrada')

    await db.formas.update(formaId, { status: 'pronta' })
    await db.notificacoes.add({
      titulo: 'Molde Pronto para Uso!',
      mensagem: `A cura do molde "${forma.nome}" foi finalizada. Ele agora está disponível para fabricação de peças.`,
      lida: false,
      criadoEm: new Date().toISOString(),
    })
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
    await registrarAuditoria('forma', formaId, 'exclusao')
  })
}
