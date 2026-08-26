import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './schema'

describe('MiauDelierDB schema', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('grava e lê um material', async () => {
    const id = await db.materiais.add({
      nome: 'Resina Epóxi Alta Viscosidade',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 1000,
      custoUnitario: 0.15,
    })
    const material = await db.materiais.get(id)
    expect(material?.nome).toBe('Resina Epóxi Alta Viscosidade')
  })

  it('tem todas as tabelas do schema', () => {
    const tabelas = db.tables.map((t) => t.name).sort()
    expect(tabelas).toEqual(
      [
        'auditoria',
        'backups',
        'categoriasMaterial',
        'clientes',
        'configuracoes',
        'consumosPeca',
        'contas',
        'eventosPeca',
        'formas',
        'materiais',
        'pecas',
        'pedidos',
        'transacoes',
      ].sort(),
    )
  })
})
