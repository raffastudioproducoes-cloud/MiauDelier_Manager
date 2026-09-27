import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import {
  criarTaxa,
  listarTaxas,
  atualizarTaxa,
  excluirTaxa,
} from './taxasRepo'

describe('repositório de taxas de marketplace', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('cadastra, lista, atualiza e exclui taxas de plataformas', async () => {
    const id = await criarTaxa({ nome: 'Shopee Padrão', percentual: 0.14, valorFixo: 3.0 })
    expect(id).toBeGreaterThan(0)

    const lista = await listarTaxas()
    expect(lista.length).toBe(1)
    expect(lista[0].nome).toBe('Shopee Padrão')
    expect(lista[0].percentual).toBe(0.14)
    expect(lista[0].valorFixo).toBe(3.0)

    await atualizarTaxa(id, { nome: 'Shopee Frete Grátis', percentual: 0.20, valorFixo: 4.0 })
    const atualizada = await db.taxas.get(id)
    expect(atualizada?.nome).toBe('Shopee Frete Grátis')
    expect(atualizada?.percentual).toBe(0.20)

    await excluirTaxa(id)
    const aposExcluir = await listarTaxas()
    expect(aposExcluir.length).toBe(0)
  })
})
