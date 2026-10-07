import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import {
  criarMaterial,
  listarMateriais,
  atualizarEstoqueMaterial,
  reporEstoqueMaterial,
  registrarCompraMaterial,
  atualizarMaterial,
  excluirMaterial,
} from './materiaisRepo'
import { criarConta } from '../financeiro/contasRepo'
import { listarAuditoria } from '../auditoria/auditoriaRepo'

describe('repositório de materiais', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-teste')
  })

  it('cria e lista um material', async () => {
    await criarMaterial({
      nome: 'Resina Cristal',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 1000,
      custoUnitario: 0.15,
    })
    const materiais = await listarMateriais()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
  })

  it('atualiza estoque de um material', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.1 })
    await atualizarEstoqueMaterial(id, 350)
    const materiais = await listarMateriais()
    expect(materiais[0].quantidadeEstoque).toBe(350)
  })

  it('repõe estoque somando à quantidade existente', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await reporEstoqueMaterial(id, 50)
    const materiais = await listarMateriais()
    expect(materiais[0].quantidadeEstoque).toBe(150)
  })

  it('registra compra de material com reposição de estoque, recálculo de custo e saída no financeiro', async () => {
    const contaId = await criarConta({ nome: 'Caixa Atelier', saldoInicial: 500 })
    const matId = await criarMaterial({
      nome: 'Silicone Amarelo',
      categoriaId: 1,
      unidade: 'g',
      quantidadeEstoque: 200,
      custoUnitario: 0.1,
    })

    await registrarCompraMaterial({
      materialId: matId,
      quantidadeComprada: 1000,
      valorTotalPago: 120,
      atualizarCustoUnitario: true,
      novoCustoUnitarioCalculado: 0.12,
      contaIdFinanceira: contaId,
    })

    const [mat] = await listarMateriais()
    expect(mat.quantidadeEstoque).toBe(1200)
    expect(mat.custoUnitario).toBe(0.12)

    const [transacao] = await db.transacoes.toArray()
    expect(transacao.contaId).toBe(contaId)
    expect(transacao.tipo).toBe('saida')
    expect(transacao.valorCriptografado).toBe('120')
  })

  it('atualiza nome, unidade e custo de um material existente', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await atualizarMaterial(id, { nome: 'Resina Cristal', unidade: 'ml', custoUnitario: 0.12, categoriaId: 1 })
    const materiais = await listarMateriais()
    expect(materiais[0].nome).toBe('Resina Cristal')
    expect(materiais[0].custoUnitario).toBe(0.12)
  })

  it('exclui um material', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await excluirMaterial(id)
    expect(await listarMateriais()).toHaveLength(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'material' && r.entidadeId === id)
    expect(registro).toBeDefined()
  })
})
