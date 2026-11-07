import { transacaoSincronizada } from '../../lib/transacaoSincronizada'
import { db, type RegistroVidaUtil } from '../../db/schema'
import { calcularPrecificacao } from '../pricing/pricing'
import { obterTarifasConfig } from '../pricing/tarifasConfigRepo'
import { calcularDesgasteEquipamentos } from './desgasteEquipamentos'
import { classificarMaterial } from './classificacaoMaterial'

/** Confirma que os usos informados na peça aconteceram; não depende do status. */
export async function confirmarUsoRealPeca(pecaId: number, ferramentas: Array<{ materialId: number; quantidade: number; vidaUtilUsos: number }> = []): Promise<void> {
  return transacaoSincronizada(async () => {
  const tarifas = ferramentas.length ? await obterTarifasConfig() : null
  await db.transaction('rw', [db.pecas, db.formas, db.equipamentos, db.materiais, db.categoriasMaterial, db.consumosPeca, db.registrosVidaUtil], async () => {
    const peca = await db.pecas.get(pecaId)
    if (!peca) throw new Error('Peça não encontrada.')
    if (peca.usoConfirmadoEm) throw new Error('O uso desta peça já foi confirmado.')
    if (peca.status === 'cancelada') throw new Error('Uma peça cancelada não pode ter uso confirmado.')
    const pecaRef = peca.identificadorUnico ?? `legado-${pecaId}`
    const formas = new Map<number, number>()
    for (const item of [{ formaId: peca.formaId, quantidade: 1 }, ...(peca.formasAdicionais ?? [])]) {
      if (!Number.isSafeInteger(item.formaId) || item.formaId <= 0 || !Number.isSafeInteger(item.quantidade) || item.quantidade <= 0) throw new Error('Formas ou quantidades inválidas.')
      formas.set(item.formaId, (formas.get(item.formaId) ?? 0) + item.quantidade)
    }
    const equipamentos = new Map<number, number>()
    for (const item of peca.usosEnergia ?? []) {
      if (!Number.isSafeInteger(item.equipamentoId) || item.equipamentoId <= 0 || !Number.isFinite(item.minutosUso) || item.minutosUso <= 0) throw new Error('Uso de equipamento inválido.')
      equipamentos.set(item.equipamentoId, (equipamentos.get(item.equipamentoId) ?? 0) + item.minutosUso)
    }
    const confirmadoEm = new Date().toISOString()
    const registros: RegistroVidaUtil[] = []
    for (const [id, quantidade] of formas) {
      if (!await db.formas.get(id)) throw new Error('Um dos moldes não existe mais; verifique os dados antes de confirmar.')
      registros.push({ id: `${pecaRef}:forma:${id}`, tipo: 'forma', recursoId: id, pecaRef, quantidade, unidade: 'uso', confirmadoEm })
    }
    for (const [id, quantidade] of equipamentos) {
      if (!await db.equipamentos.get(id)) throw new Error('Um dos equipamentos não existe mais; verifique os dados antes de confirmar.')
      registros.push({ id: `${pecaRef}:equipamento:${id}`, tipo: 'equipamento', recursoId: id, pecaRef, quantidade, unidade: 'minuto', confirmadoEm })
    }
    const ferramentasVistas = new Set<number>()
    let custoDesgasteFerramentas = 0
    const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
    for (const ferramenta of ferramentas) {
      const material = await db.materiais.get(ferramenta.materialId)
      const classificacao = material ? classificarMaterial(material, await db.categoriasMaterial.toArray()) : undefined
      if (!material || classificacao !== 'ferramenta') throw new Error('Selecione apenas materiais classificados como ferramenta.')
      if (material.unidade.toLowerCase() !== 'un' || material.quantidadeEstoque !== 1) throw new Error(`Cadastre "${material.nome}" individualmente com uma unidade para controlar sua vida útil.`)
      if (consumos.some(consumo => consumo.materialId === ferramenta.materialId)) throw new Error(`"${material.nome}" está nos materiais consumidos. Remova essa linha antes de registrar a ferramenta reutilizável para não contar duas vezes.`)
      if (!Number.isFinite(material.custoUnitario) || material.custoUnitario <= 0) throw new Error(`Informe um custo de aquisição maior que zero para "${material.nome}" antes de calcular a amortização.`)
      if (ferramentasVistas.has(ferramenta.materialId) || !Number.isSafeInteger(ferramenta.quantidade) || ferramenta.quantidade <= 0 || !Number.isSafeInteger(ferramenta.vidaUtilUsos) || ferramenta.vidaUtilUsos <= 0) throw new Error('Informe ferramentas sem repetição, usos e vida útil válidos.')
      ferramentasVistas.add(ferramenta.materialId)
      const custoDesgaste = material.custoUnitario / ferramenta.vidaUtilUsos * ferramenta.quantidade
      custoDesgasteFerramentas += custoDesgaste
      registros.push({ id: `${pecaRef}:ferramenta:${ferramenta.materialId}`, tipo: 'ferramenta', recursoId: ferramenta.materialId, pecaRef, quantidade: ferramenta.quantidade, unidade: 'uso', vidaUtilUsosReferencia: ferramenta.vidaUtilUsos, custoDesgaste, confirmadoEm })
    }
    // IDs determinísticos tornam confirmação repetida da mesma peça idempotente
    // mesmo quando o marcador da peça não chegou junto aos eventos de uso.
    for (const registro of registros) {
      const existente = await db.registrosVidaUtil.get(registro.id)
      if (existente && existente.quantidade !== registro.quantidade) throw new Error('Já existe uma confirmação de uso diferente para esta peça. Revise os registros antes de continuar.')
      if (!existente) await db.registrosVidaUtil.add(registro)
    }
    let precoVenda = peca.precoVenda
    if (ferramentas.length && tarifas && peca.status !== 'vendida') {
      let custoMaterial = 0
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        const custo = consumo.custoUnitarioNoConsumo ?? material?.custoUnitario
        if (custo === undefined || !Number.isFinite(custo)) throw new Error('Um material consumido não possui custo para recalcular a peça.')
        custoMaterial += consumo.quantidade * custo
      }
      let custoForma = 0
      for (const [formaId, quantidade] of formas) {
        const forma = await db.formas.get(formaId)
        if (forma?.vidaUtilUsos && forma.vidaUtilUsos > 0) custoForma += quantidade * (forma.custoFabricacao ?? 0) / forma.vidaUtilUsos
      }
      const propaganda = peca.diasPropaganda && peca.diasPropaganda > 0 ? (peca.valorPropagandaTotal ?? 0) / peca.diasPropaganda : 0
      precoVenda = calcularPrecificacao({ custoMaterial, custoAcessorios: (peca.custoEpiInsumos ?? 0) + propaganda + (peca.valorFrete ?? 0) + custoDesgasteFerramentas, horasProducao: peca.horasMaoDeObra ?? 0, valorHora: tarifas.valorHoraMaoDeObra || 25, rateioFixoPercent: 0, margemLucroPercent: peca.margemDesejada ?? 50, usosEnergia: peca.usosEnergia ?? [], tarifaKwh: tarifas.tarifaKwh || 0.85, litrosAgua: peca.litrosAgua ?? 0, custoForma, custoDesgasteEquipamentos: calcularDesgasteEquipamentos(peca.usosEnergia ?? [], await db.equipamentos.toArray()).custo, percentualTaxas: peca.percentualTaxas ?? 0 }).precoFinal
    }
    await db.pecas.update(pecaId, { usoConfirmadoEm: confirmadoEm, custoDesgasteFerramentas, precoVenda })
  })

  })
}

export async function obterVidaFerramentas(): Promise<Map<number, { usos: number; vidaUtilUsos: number }>> {
  const registros = await db.registrosVidaUtil.where('tipo').equals('ferramenta').toArray()
  registros.sort((a, b) => a.confirmadoEm.localeCompare(b.confirmadoEm) || a.id.localeCompare(b.id))
  const totais = new Map<number, { usos: number; vidaUtilUsos: number }>()
  for (const registro of registros) {
    const anterior = totais.get(registro.recursoId)
    totais.set(registro.recursoId, { usos: (anterior?.usos ?? 0) + registro.quantidade, vidaUtilUsos: registro.vidaUtilUsosReferencia ?? anterior?.vidaUtilUsos ?? 0 })
  }
  return totais
}

export async function obterUsosConfirmados(tipo: RegistroVidaUtil['tipo']): Promise<Map<number, number>> {
  const registros = await db.registrosVidaUtil.where('tipo').equals(tipo).toArray()
  const totais = new Map<number, number>()
  for (const registro of registros) totais.set(registro.recursoId, (totais.get(registro.recursoId) ?? 0) + registro.quantidade)
  return totais
}
