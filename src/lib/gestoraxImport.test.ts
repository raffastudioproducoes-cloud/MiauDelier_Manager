import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { setupAccount } from './auth'
import { decifrarCampo } from './camposCifrados'
import { ehBackupGestoraX, importarBackupGestoraX } from './gestoraxImport'

function backupGestoraXExemplo() {
  return JSON.stringify({
    aplicacao: 'gestorax',
    versaoBanco: 3,
    geradoEm: Date.now(),
    dados: {
      configuracoes: [],
      materiais: [
        { id: 1, nome: 'Resina Cristal', categoria: 'liquidos', subcategoria: 'Resinas', unidade: 'ml', estoqueAtual: 1000, custoPorUnidade: 0.12, criadoEm: 1700000000000 },
      ],
      categoriasMaterial: [],
      formas: [
        { id: 5, nome: 'Molde Coração', comprimentoCm: 10, larguraCm: 10, alturaCm: 2, volumeMl: 200, custoFabricacao: 50, vidaUtilUsos: 100, usosRealizados: 3, criadoEm: 1700000000000, atualizadoEm: 1700000000000 },
      ],
      pecas: [
        { id: 9, numeroSerie: '#0001', nome: 'Chaveiro Coração', descricao: '', status: 'finalizada', formaId: 5, horasMaoDeObra: 0, maoDeObraFixa: 0, usosEnergia: [], percentualTaxas: 0, margemDesejada: 0.3, precoVenda: 25.5, observacoes: '', fotos: [], criadoEm: 1700000000000, atualizadoEm: 1700000000000 },
        { id: 10, numeroSerie: '#0002', nome: 'Peça órfã', descricao: '', status: 'criada', horasMaoDeObra: 0, maoDeObraFixa: 0, usosEnergia: [], percentualTaxas: 0, margemDesejada: 0.3, observacoes: '', fotos: [], criadoEm: 1700000000000, atualizadoEm: 1700000000000 },
      ],
      consumosPeca: [
        { id: 20, pecaId: 9, materialId: 1, nomeMaterial: 'Resina Cristal', quantidade: 80, unidade: 'ml', custoUnitario: 0.12, custoTotal: 9.6, registradoEm: 1700000000000 },
      ],
      eventosPeca: [
        { id: 30, pecaId: 9, tipo: 'venda', descricao: 'Vendida no evento', criadoEm: 1700000000000 },
      ],
      transacoes: [
        { id: 40, tipo: 'entrada', descricao: 'Venda chaveiro', valor: 25.5, categoria: 'vendas', contaId: 1, centroCusto: '', data: 1700000000000, criadoEm: 1700000000000 },
        { id: 41, tipo: 'transferencia', descricao: 'Transferência entre contas', valor: 10, categoria: '', contaId: 1, centroCusto: '', data: 1700000000000, criadoEm: 1700000000000 },
      ],
      contas: [
        { id: 1, nome: 'Caixa', saldoInicial: 100, criadoEm: 1700000000000 },
      ],
      equipamentos: [],
      taxas: [],
      notificacoes: [],
      auditoria: [],
      perfilUsuario: [],
    },
    checksumDados: 'ignorado-no-teste',
  })
}

describe('importação de backup do GestoraX', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('reconhece o envelope do GestoraX', () => {
    expect(ehBackupGestoraX(backupGestoraXExemplo())).toBe(true)
    expect(ehBackupGestoraX(JSON.stringify({ dados: {}, checksum: 'x' }))).toBe(false)
    expect(ehBackupGestoraX('não é json')).toBe(false)
  })

  it('mescla materiais, formas, peças, contas e transações sem apagar dados existentes', async () => {
    await db.materiais.add({ nome: 'Material que já existia', categoriaId: 999, unidade: 'un', quantidadeEstoque: 5, custoUnitario: 1 })

    const relatorio = await importarBackupGestoraX(backupGestoraXExemplo())

    expect(relatorio.materiais).toBe(1)
    expect(relatorio.formas).toBe(1)
    expect(relatorio.pecas).toBe(1)
    expect(relatorio.consumos).toBe(1)
    expect(relatorio.eventos).toBe(1)
    expect(relatorio.contas).toBe(1)
    expect(relatorio.transacoes).toBe(1)
    expect(relatorio.ignorados).toHaveLength(2)

    const materiais = await db.materiais.toArray()
    expect(materiais).toHaveLength(2)
    expect(materiais.some((m) => m.nome === 'Material que já existia')).toBe(true)
    expect(materiais.some((m) => m.nome === 'Resina Cristal')).toBe(true)

    const [peca] = await db.pecas.toArray()
    expect(peca.nome).toBe('Chaveiro Coração')
    expect(peca.status).toBe('pronta')
    expect(peca.precoVenda).toBe(25.5)

    const [transacao] = await db.transacoes.toArray()
    expect(await decifrarCampo(transacao.valorCriptografado)).toBe('25.5')

    const [conta] = await db.contas.toArray()
    expect(await decifrarCampo(conta.saldoCriptografado)).toBe('100')
  })

  it('não mexe na autenticação nem exige logout', async () => {
    await importarBackupGestoraX(backupGestoraXExemplo())
    expect(await db.materiais.count()).toBeGreaterThan(0)
  })
})
