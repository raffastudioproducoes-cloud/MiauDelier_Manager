import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { setupAccount, login, clearSession, getSessionKey } from './auth'
import { exportarBackup, importarBackup } from './backup'

async function semearMaterial() {
  await db.categoriasMaterial.add({ nome: 'Resinas' })
  await db.materiais.add({
    nome: 'Resina Cristal',
    categoriaId: 1,
    unidade: 'ml',
    quantidadeEstoque: 500,
    custoUnitario: 0.12,
  })
}

describe('backup JSON', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
  })

  it('exporta e reimporta os dados sem perda', async () => {
    await setupAccount('senha-do-backup-2026')
    await semearMaterial()

    const json = await exportarBackup()

    await db.delete()
    await db.open()
    expect(await db.materiais.count()).toBe(0)

    await importarBackup(json)

    const materiais = await db.materiais.toArray()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
  })

  it('restaura em dispositivo novo: backup + senha original devolvem o acesso e os dados', async () => {
    await setupAccount('senha-do-rafa-2026')
    await semearMaterial()
    const json = await exportarBackup()

    // dispositivo novo: banco limpo, nenhuma conta, nenhuma sessão
    await db.delete()
    await db.open()
    clearSession()

    await importarBackup(json)
    expect(getSessionKey()).toBeNull()

    const chave = await login('senha-do-rafa-2026')
    expect(chave).not.toBeNull()
    expect(await login('outra-senha-qualquer')).toBeNull()

    const materiais = await db.materiais.toArray()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
  })

  it('encerra a sessão ao importar, para não ficar com chave da senha antiga', async () => {
    await setupAccount('senha-antiga')
    const json = await exportarBackup()
    expect(getSessionKey()).not.toBeNull()

    await importarBackup(json)

    expect(getSessionKey()).toBeNull()
  })

  it('rejeita backup com checksum inválido', async () => {
    await setupAccount('senha-qualquer')
    const json = await exportarBackup()
    const parsed = JSON.parse(json)
    parsed.checksum = 'checksum-adulterado'

    await expect(importarBackup(JSON.stringify(parsed))).rejects.toThrow(/checksum/i)
  })

  it('mantém os dados originais intactos quando o checksum falha', async () => {
    await setupAccount('senha-qualquer')
    await semearMaterial()

    const json = await exportarBackup()
    const parsed = JSON.parse(json)
    parsed.checksum = 'checksum-adulterado'

    await expect(importarBackup(JSON.stringify(parsed))).rejects.toThrow(/checksum/i)

    const materiais = await db.materiais.toArray()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
    expect(await db.categoriasMaterial.count()).toBe(1)
  })

  it('rejeita backup sem as configuracoes de autenticação, sem escrever nada', async () => {
    await setupAccount('senha-qualquer')
    await semearMaterial()
    const json = await exportarBackup()

    const parsed = JSON.parse(json)
    delete parsed.dados.configuracoes
    const semConfiguracoes = await exportarBackupFalso(parsed.dados)

    await expect(importarBackup(semConfiguracoes)).rejects.toThrow(/autenticação/i)
    expect(await db.materiais.count()).toBe(1)
    expect(await db.configuracoes.count()).toBe(2)
  })

  it('rejeita backup sem o verificador, mesmo com salt presente', async () => {
    await setupAccount('senha-qualquer')
    const parsed = JSON.parse(await exportarBackup())
    parsed.dados.configuracoes = parsed.dados.configuracoes.filter(
      (linha: { chave: string }) => linha.chave !== 'auth.verificador',
    )

    await expect(importarBackup(await exportarBackupFalso(parsed.dados))).rejects.toThrow(
      /autenticação/i,
    )
  })

  it('rejeita JSON válido que não é um envelope de backup', async () => {
    await expect(importarBackup('{"qualquer":"coisa"}')).rejects.toThrow(/backup inválido/i)
    await expect(importarBackup('não é json')).rejects.toThrow(/não é JSON/i)
  })
})

// Reconstrói um envelope com checksum coerente para os dados adulterados, de modo que os testes
// exercitem a validação de conteúdo e não parem antes, no checksum.
async function exportarBackupFalso(dados: Record<string, unknown[]>): Promise<string> {
  const serializados = JSON.stringify(dados)
  let hash = 0x811c9dc5
  for (let i = 0; i < serializados.length; i++) {
    hash ^= serializados.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return JSON.stringify({ dados, checksum: (hash >>> 0).toString(16).padStart(8, '0') })
}
