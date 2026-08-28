import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { definirChaveGemini } from './iaConfigRepo'
import { pedirDicaIA, IaIndisponivelError } from './geminiClient'

describe('cliente Gemini', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lança IaIndisponivelError quando não há chave configurada', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    await expect(pedirDicaIA('Como calculo o volume de um molde?')).rejects.toThrow(IaIndisponivelError)
  })

  it('lança IaIndisponivelError quando está offline, mesmo com chave configurada', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.stubGlobal('navigator', { onLine: false })
    await expect(pedirDicaIA('Como calculo o volume de um molde?')).rejects.toThrow(IaIndisponivelError)
  })

  it('monta a requisição com a instrução de sistema fixa e a personalidade, e retorna o texto da resposta', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.stubGlobal('navigator', { onLine: true })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Use a fórmula do volume cilíndrico.' }] } }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const resposta = await pedirDicaIA('Como calculo o volume de um molde cilíndrico?')

    expect(resposta).toBe('Use a fórmula do volume cilíndrico.')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, opcoes] = fetchMock.mock.calls[0]
    const corpo = JSON.parse(opcoes.body)
    expect(corpo.systemInstruction.parts[0].text).toContain('resina')
  })

  it('lança IaIndisponivelError quando a API responde com erro', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

    await expect(pedirDicaIA('pergunta qualquer')).rejects.toThrow(IaIndisponivelError)
  })
})
