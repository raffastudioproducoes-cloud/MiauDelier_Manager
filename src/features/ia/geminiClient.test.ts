import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { definirChaveGemini } from './iaConfigRepo'
import { pedirDicaIA, pedirRespostaChat, IaIndisponivelError } from './geminiClient'
import type { MensagemIA } from '../../db/schema'

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

  it('lança IaIndisponivelError com mensagem em português quando fetch falha por erro de rede', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(pedirDicaIA('pergunta qualquer')).rejects.toThrow(IaIndisponivelError)
    await expect(pedirDicaIA('pergunta qualquer')).rejects.toThrow('Não foi possível falar com o assistente agora.')
  })

  it('pedirRespostaChat envia o histórico como contents e retorna o texto da resposta', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.stubGlobal('navigator', { onLine: true })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Deixe curar por 24 horas.' }] } }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const historico: MensagemIA[] = [
      { id: 1, papel: 'usuario', texto: 'Quanto tempo de cura?', criadoEm: new Date().toISOString() },
      { id: 2, papel: 'assistente', texto: 'Depende da resina.', criadoEm: new Date().toISOString() },
    ]

    const resposta = await pedirRespostaChat(historico, 'E pra resina cristalina?')

    expect(resposta).toBe('Deixe curar por 24 horas.')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, opcoes] = fetchMock.mock.calls[0]
    const corpo = JSON.parse(opcoes.body)
    expect(corpo.contents).toHaveLength(3)
    expect(corpo.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Quanto tempo de cura?' }] })
    expect(corpo.contents[1]).toEqual({ role: 'model', parts: [{ text: 'Depende da resina.' }] })
    expect(corpo.contents[2]).toEqual({ role: 'user', parts: [{ text: 'E pra resina cristalina?' }] })
    expect(corpo.systemInstruction.parts[0].text).toContain('resina')
  })

  it('pedirRespostaChat lança IaIndisponivelError quando não há chave configurada', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    await expect(pedirRespostaChat([], 'pergunta qualquer')).rejects.toThrow(IaIndisponivelError)
  })
})
