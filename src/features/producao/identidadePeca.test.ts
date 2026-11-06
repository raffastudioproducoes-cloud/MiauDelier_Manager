import { describe, expect, it, vi } from 'vitest'
import { gerarIdNumericoPeca, obterIdNumericoPecaDisponivel } from './identidadePeca'

describe('identificação numérica de peças', () => {
  it('gera inteiro seguro distante da faixa sequencial legada', () => {
    const id = gerarIdNumericoPeca()
    expect(Number.isSafeInteger(id)).toBe(true)
    expect(id).toBeGreaterThanOrEqual(2 ** 52)
    expect(id).toBeLessThan(2 ** 52 + 2 ** 51)
  })

  it('repete a geração se o identificador já existir localmente', async () => {
    let consultas = 0
    const existe = vi.fn(async () => ++consultas === 1 ? { id: 1 } : undefined)
    expect(Number.isSafeInteger(await obterIdNumericoPecaDisponivel(existe))).toBe(true)
    expect(existe).toHaveBeenCalledTimes(2)
  })

  it('interrompe se não encontrar identificador livre', async () => {
    await expect(obterIdNumericoPecaDisponivel(async () => ({ id: 1 }))).rejects.toThrow(/identificador disponível/i)
  })
})
