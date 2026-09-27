import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { obterTarifasConfig, salvarTarifasConfig } from './tarifasConfigRepo'

describe('tarifasConfigRepo', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('retorna valores padrão quando nada foi salvo', async () => {
    const tarifas = await obterTarifasConfig()
    expect(tarifas.valorHoraMaoDeObra).toBe(25.00)
    expect(tarifas.tarifaKwh).toBe(0.85)
    expect(tarifas.tarifaAguaM3).toBe(15.00)
  })

  it('salva e recupera tarifas configuradas', async () => {
    await salvarTarifasConfig({
      valorHoraMaoDeObra: 30.00,
      tarifaKwh: 1.10,
      tarifaAguaM3: 20.00,
    })

    const tarifas = await obterTarifasConfig()
    expect(tarifas.valorHoraMaoDeObra).toBe(30.00)
    expect(tarifas.tarifaKwh).toBe(1.10)
    expect(tarifas.tarifaAguaM3).toBe(20.00)
  })
})
