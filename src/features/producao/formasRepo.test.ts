import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../../db/schema'
import { criarForma, listarFormas, atualizarForma, excluirForma } from './formasRepo'
import { listarAuditoria } from '../auditoria/auditoriaRepo'
import { criarPeca, listarEventosDaPeca } from './pecasRepo'
import { calcularPrecificacao } from '../pricing/pricing'

describe('repositório de formas', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('cria e lista uma forma cilíndrica', async () => {
    await criarForma({
      nome: 'Porta-copo redondo',
      geometria: 'cilindrico',
      dimensoesCm: { raio: 5, altura: 1.5 },
    })
    const formas = await listarFormas()
    expect(formas).toHaveLength(1)
    expect(formas[0].geometria).toBe('cilindrico')
  })

  it('debita somente o silicone usado e amortiza o custo real por peça', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const formaId = await criarForma({ nome: 'Mesa', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 100, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, custoCaixaEstrutura: 0, vidaUtilUsos: 100 })
    const forma = await db.formas.get(formaId)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect(forma?.custoFabricacao).toBe(200)
    const custoForma = forma!.custoFabricacao! / forma!.vidaUtilUsos!
    const resultado = calcularPrecificacao({ custoMaterial: 0, custoAcessorios: 0, horasProducao: 0, valorHora: 0, rateioFixoPercent: 0, margemLucroPercent: 0, custoForma })
    expect(resultado.custoTotal).toBe(2)
    const pecaId = await criarPeca({ nome: 'Mesa pronta', formaId, consumos: [] })
    expect((await listarEventosDaPeca(pecaId))[0].descricao).toContain('R$ 2.00')
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
  })

  it('soma o custo da caixa ao custo do silicone no cadastro', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const id = await criarForma({ nome: 'Mesa', geometria: 'direto', dimensoesCm: {}, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, custoCaixaEstrutura: 25, custoFabricacao: 25, vidaUtilUsos: 100 })
    expect((await db.formas.get(id))?.custoFabricacao).toBe(225)
  })

  it('não registra baixa de silicone sem conexão e preserva os dados', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const conexao = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      await expect(criarForma({ nome: 'Mesa', geometria: 'direto', dimensoesCm: {}, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, vidaUtilUsos: 100 })).rejects.toThrow(/conecte-se/i)
      expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
      expect(await db.formas.count()).toBe(0)
    } finally {
      conexao.mockRestore()
    }
  })

  it('ajusta estoque e custo apenas pela diferença em edições sucessivas', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const dados = { nome: 'Mesa', geometria: 'direto' as const, dimensoesCm: {}, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, custoCaixaEstrutura: 25, vidaUtilUsos: 100 }
    const id = await criarForma(dados)
    await atualizarForma(id, { ...dados, quantidadeSiliconeUsada: 3 })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(7)
    expect((await db.formas.get(id))?.custoFabricacao).toBe(325)
    await atualizarForma(id, { ...dados, quantidadeSiliconeUsada: 1 })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
    expect((await db.formas.get(id))?.custoFabricacao).toBe(125)
    await atualizarForma(id, { ...dados, quantidadeSiliconeUsada: 1 })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
    await expect(atualizarForma(id, { ...dados, quantidadeSiliconeUsada: 20 })).rejects.toThrow(/estoque insuficiente/i)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
  })

  it('regulariza uma unica vez consumo antigo salvo sem baixa', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const dados = { nome: 'Forma antiga', geometria: 'direto' as const, dimensoesCm: {}, vidaUtilUsos: 100, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2 }
    const id = (await db.formas.add(dados)) as number
    await atualizarForma(id, dados)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    await atualizarForma(id, dados, { registrarConsumoPendente: true })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect((await db.formas.get(id))?.custoFabricacao).toBe(200)
    await expect(atualizarForma(id, dados, { registrarConsumoPendente: true })).rejects.toThrow(/já foi regularizado/i)
    await atualizarForma(id, dados)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
  })

  it('registra o primeiro consumo em molde antigo e preserva o custo histórico ao devolver silicone', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const dados = { nome: 'Molde antigo', geometria: 'direto' as const, dimensoesCm: {}, vidaUtilUsos: 100, custoCaixaEstrutura: 25 }
    const id = await criarForma(dados)
    await atualizarForma(id, { ...dados, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2 })
    expect((await db.formas.get(id))?.custoFabricacao).toBe(225)
    await db.materiais.update(materialId, { custoUnitario: 200 })
    await atualizarForma(id, { ...dados, materialSiliconeId: materialId, quantidadeSiliconeUsada: 1 })
    expect((await db.formas.get(id))?.custoFabricacao).toBe(125)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
  })

  it('reverte a devolução do material anterior quando o novo não tem estoque suficiente', async () => {
    const a = await db.materiais.add({ nome: 'Silicone A', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const b = await db.materiais.add({ nome: 'Silicone B', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 1, custoUnitario: 200 })
    const dados = { nome: 'Mesa', geometria: 'direto' as const, dimensoesCm: {}, materialSiliconeId: a, quantidadeSiliconeUsada: 2, vidaUtilUsos: 100 }
    const id = await criarForma(dados)
    await expect(atualizarForma(id, { ...dados, materialSiliconeId: b, quantidadeSiliconeUsada: 2 })).rejects.toThrow(/estoque insuficiente/i)
    expect((await db.materiais.get(a))?.quantidadeEstoque).toBe(8)
    expect((await db.materiais.get(b))?.quantidadeEstoque).toBe(1)
    expect((await db.formas.get(id))?.materialSiliconeId).toBe(a)
  })

  it('atualiza uma forma existente', async () => {
    const id = await criarForma({ nome: 'Molde X', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await atualizarForma(id, { nome: 'Molde X Editado', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 25 })
    const formas = await listarFormas()
    expect(formas[0].nome).toBe('Molde X Editado')
  })

  it('exclui uma forma', async () => {
    const id = await criarForma({ nome: 'Molde Y', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await excluirForma(id)
    expect(await listarFormas()).toHaveLength(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'forma' && r.entidadeId === id)
    expect(registro).toBeDefined()
  })
})
