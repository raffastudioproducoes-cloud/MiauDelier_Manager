import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { obterTarifasConfig, salvarTarifasConfig } from './tarifasConfigRepo'
import { consultarTarifasConcessionaria, sincronizarTarifasConcessionaria } from './concessionariasService'

describe('concessionariasService', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('retorna a concessionária e tarifa correta para SP', async () => {
    const dados = await consultarTarifasConcessionaria('Brasil', 'SP')
    expect(dados.concessionariaLuz).toContain('Enel')
    expect(dados.concessionariaAgua).toContain('Sabesp')
    expect(dados.tarifaKwh).toBeGreaterThan(0)
    expect(dados.tarifaAguaM3).toBeGreaterThan(0)
  })

  it('sincroniza tarifas e detecta quando os valores são os mesmos (ignora alteração desnecessária)', async () => {
    await salvarTarifasConfig({
      pais: 'Brasil',
      estado: 'SP',
      cidadeBairro: 'São Paulo',
      tarifaKwh: 0.85,
      tarifaAguaM3: 15.40,
    })

    const res = await sincronizarTarifasConcessionaria(true)
    expect(res.atualizou).toBe(true)
    expect(res.houveAlteracaoDeValor).toBe(false)
    expect(res.mensagemStatus).toContain('sem alteração')

    const config = await obterTarifasConfig()
    expect(config.concessionariaLuz).toContain('Enel')
    expect(config.concessionariaAgua).toContain('Sabesp')
  })

  it('sincroniza e altera o valor quando a concessionária tem valores diferentes', async () => {
    await salvarTarifasConfig({
      pais: 'Brasil',
      estado: 'RJ',
      cidadeBairro: 'Niterói',
      tarifaKwh: 0.50, // valor desatualizado
      tarifaAguaM3: 10.00,
    })

    const res = await sincronizarTarifasConcessionaria(true)
    expect(res.atualizou).toBe(true)
    expect(res.houveAlteracaoDeValor).toBe(true)
    expect(res.tarifaKwh).toBe(0.98) // Light RJ
    expect(res.tarifaAguaM3).toBe(18.20)

    const config = await obterTarifasConfig()
    expect(config.tarifaKwh).toBe(0.98)
    expect(config.tarifaAguaM3).toBe(18.20)
  })
})
