import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { registrarAuditoria, listarAuditoria } from './auditoriaRepo'

describe('repositório de auditoria', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('registra uma entrada de auditoria', async () => {
    await registrarAuditoria('material', 1, undefined, undefined)
    const registros = await listarAuditoria()
    expect(registros).toHaveLength(1)
    expect(registros[0].entidade).toBe('material')
    expect(registros[0].quem).toBe('usuário')
  })

  it('lista em ordem decrescente por data', async () => {
    await registrarAuditoria('material', 1)
    await new Promise((r) => setTimeout(r, 5))
    await registrarAuditoria('conta', 2)
    const registros = await listarAuditoria()
    expect(registros[0].entidade).toBe('conta')
  })
})
