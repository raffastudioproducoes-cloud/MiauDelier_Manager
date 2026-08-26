import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { exportarBackup, importarBackup } from './backup'

describe('backup JSON', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('exporta e reimporta os dados sem perda', async () => {
    await db.categoriasMaterial.add({ nome: 'Resinas' })
    await db.materiais.add({
      nome: 'Resina Cristal',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 500,
      custoUnitario: 0.12,
    })

    const json = await exportarBackup()

    await db.delete()
    await db.open()
    expect(await db.materiais.count()).toBe(0)

    await importarBackup(json)

    const materiais = await db.materiais.toArray()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
  })

  it('rejeita backup com checksum inválido', async () => {
    const json = await exportarBackup()
    const parsed = JSON.parse(json)
    parsed.checksum = 'checksum-adulterado'
    const jsonAdulterado = JSON.stringify(parsed)

    await expect(importarBackup(jsonAdulterado)).rejects.toThrow(/checksum/i)
  })

  it('mantém os dados originais intactos quando o checksum falha', async () => {
    await db.categoriasMaterial.add({ nome: 'Resinas' })
    await db.materiais.add({
      nome: 'Resina Cristal',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 500,
      custoUnitario: 0.12,
    })

    const json = await exportarBackup()
    const parsed = JSON.parse(json)
    parsed.checksum = 'checksum-adulterado'
    const jsonAdulterado = JSON.stringify(parsed)

    await expect(importarBackup(jsonAdulterado)).rejects.toThrow(/checksum/i)

    const materiais = await db.materiais.toArray()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
    expect(await db.categoriasMaterial.count()).toBe(1)
  })
})
