import { db, type Forma } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export type NovaForma = Omit<Forma, 'id'>

export async function criarForma(nova: NovaForma): Promise<number> {
  return db.transaction('rw', db.formas, db.materiais, db.notificacoes, async () => {
    if (nova.materialSiliconeId && (!Number.isFinite(nova.quantidadeSiliconeUsada) || (nova.quantidadeSiliconeUsada ?? 0) <= 0)) throw new Error('Informe uma quantidade de silicone maior que zero.')
    if (nova.materialSiliconeId && (!Number.isSafeInteger(nova.vidaUtilUsos) || (nova.vidaUtilUsos ?? 0) <= 0)) throw new Error('Informe uma vida útil em usos maior que zero.')
    if (nova.custoCaixaEstrutura !== undefined && (!Number.isFinite(nova.custoCaixaEstrutura) || nova.custoCaixaEstrutura < 0)) throw new Error('Custo da caixa inválido.')
    let custoCalc = nova.custoFabricacao
    let custoSiliconeFabricacao = nova.custoSiliconeFabricacao
    const agoraMs = Date.now()

    if (nova.materialSiliconeId && nova.quantidadeSiliconeUsada && nova.quantidadeSiliconeUsada > 0) {
      const materialSilicone = await db.materiais.get(nova.materialSiliconeId)
      if (!materialSilicone) throw new Error('Material de silicone não encontrado.')
      if (!Number.isFinite(materialSilicone.custoUnitario) || materialSilicone.custoUnitario < 0) throw new Error('Custo do silicone inválido.')
      if (nova.quantidadeSiliconeUsada > materialSilicone.quantidadeEstoque) {
        throw new Error(
          `Estoque insuficiente de silicone "${materialSilicone.nome}": disponível ${materialSilicone.quantidadeEstoque}, solicitado ${nova.quantidadeSiliconeUsada}`,
        )
      }
      await db.materiais.update(nova.materialSiliconeId, {
        quantidadeEstoque: materialSilicone.quantidadeEstoque - nova.quantidadeSiliconeUsada,
      })
      custoSiliconeFabricacao = nova.quantidadeSiliconeUsada * materialSilicone.custoUnitario
      custoCalc = custoSiliconeFabricacao + (nova.custoCaixaEstrutura ?? 0)
    }

    const ehCurando = typeof nova.curaMinutos === 'number' && nova.curaMinutos > 0
    const statusFinal = nova.status ?? (ehCurando ? 'curando' : 'pronta')
    const curaIniciadaEm = ehCurando ? (nova.curaIniciadaEm ?? agoraMs) : undefined

    const id = (await db.formas.add({
      ...nova,
      custoFabricacao: custoCalc,
      custoSiliconeFabricacao,
      baixaSiliconeConfirmada: nova.materialSiliconeId && nova.quantidadeSiliconeUsada ? true : undefined,
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

export async function atualizarForma(formaId: number, dados: NovaForma, opcoes?: { registrarConsumoPendente?: boolean }): Promise<void> {
  await db.transaction('rw', db.formas, db.materiais, async () => {
    const anterior = await db.formas.get(formaId)
    if (!anterior) throw new Error('Forma não encontrada')
    const qtdAnterior = anterior.quantidadeSiliconeUsada ?? 0
    const qtdNova = dados.materialSiliconeId ? dados.quantidadeSiliconeUsada ?? 0 : 0
    const regularizar = opcoes?.registrarConsumoPendente === true
    if (regularizar && anterior.baixaSiliconeConfirmada) throw new Error('O consumo de silicone já foi regularizado.')
    if (regularizar && (!anterior.materialSiliconeId || qtdAnterior <= 0 || anterior.materialSiliconeId !== dados.materialSiliconeId)) throw new Error('Para regularizar, mantenha o silicone originalmente registrado na forma.')
    if (!Number.isFinite(qtdNova) || (dados.materialSiliconeId && qtdNova <= 0)) throw new Error('Quantidade de silicone inválida.')
    if (dados.materialSiliconeId && (!Number.isSafeInteger(dados.vidaUtilUsos) || (dados.vidaUtilUsos ?? 0) <= 0)) throw new Error('Informe uma vida útil em usos maior que zero.')
    if (dados.custoCaixaEstrutura !== undefined && (!Number.isFinite(dados.custoCaixaEstrutura) || dados.custoCaixaEstrutura < 0)) throw new Error('Custo da caixa inválido.')
    const custoAnterior = anterior.custoSiliconeFabricacao ?? Math.max(0, (anterior.custoFabricacao ?? 0) - (anterior.custoCaixaEstrutura ?? 0))
    let custoSilicone = qtdAnterior > 0 && !regularizar ? custoAnterior : 0
    if (anterior.materialSiliconeId && anterior.materialSiliconeId !== dados.materialSiliconeId && qtdAnterior > 0) {
      const antigo = await db.materiais.get(anterior.materialSiliconeId)
      if (!antigo) throw new Error('Material de silicone anterior não encontrado.')
      await db.materiais.update(anterior.materialSiliconeId, { quantidadeEstoque: antigo.quantidadeEstoque + qtdAnterior })
      custoSilicone = 0
    }
    if (dados.materialSiliconeId) {
      const material = await db.materiais.get(dados.materialSiliconeId)
      if (!material) throw new Error('Material de silicone não encontrado.')
      const mesma = dados.materialSiliconeId === anterior.materialSiliconeId
      const diferenca = qtdNova - (mesma && !regularizar ? qtdAnterior : 0)
      if (diferenca > material.quantidadeEstoque) throw new Error(`Estoque insuficiente de silicone "${material.nome}".`)
      if (!Number.isFinite(material.custoUnitario) || material.custoUnitario < 0) throw new Error('Custo do silicone inválido.')
      if (diferenca !== 0) await db.materiais.update(dados.materialSiliconeId, { quantidadeEstoque: material.quantidadeEstoque - diferenca })
      custoSilicone = diferenca >= 0 ? custoSilicone + diferenca * material.custoUnitario : custoSilicone * qtdNova / qtdAnterior
    }
    const temSilicone = !!dados.materialSiliconeId || (!!anterior.materialSiliconeId && qtdAnterior > 0)
    await db.formas.update(formaId, { ...dados, quantidadeSiliconeUsada: dados.materialSiliconeId ? qtdNova : undefined, custoSiliconeFabricacao: temSilicone ? custoSilicone : dados.custoSiliconeFabricacao, custoFabricacao: temSilicone ? custoSilicone + (dados.custoCaixaEstrutura ?? 0) : dados.custoFabricacao, baixaSiliconeConfirmada: dados.materialSiliconeId && (regularizar || anterior.baixaSiliconeConfirmada || qtdAnterior === 0) ? true : undefined })
  })
}

export async function excluirForma(formaId: number): Promise<void> {
  await db.transaction('rw', db.formas, db.auditoria, async () => {
    await db.formas.delete(formaId)
    await registrarAuditoria('forma', formaId, 'exclusao')
  })
}
