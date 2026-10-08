import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke } } }))

const { configurarChaveGemini, obterEstadoGemini, pedirDicaIA, removerChaveGemini } = await import('./geminiClient')

describe('geminiClient', () => {
  it('mostra a causa segura devolvida pela Edge Function', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { context: new Response(JSON.stringify({ error: 'A chave Gemini e invalida ou nao tem acesso a este modelo.' })) },
    })

    await expect(pedirDicaIA('teste')).rejects.toThrow('A chave Gemini e invalida ou nao tem acesso a este modelo.')
  })

  it('envia a chave configurada somente para a Edge Function autenticada', async () => {
    invoke.mockResolvedValueOnce({ data: {}, error: null })

    await configurarChaveGemini('chave-da-propria-usuaria')

    expect(invoke).toHaveBeenLastCalledWith('gemini', {
      body: { action: 'configure', apiKey: 'chave-da-propria-usuaria' },
    })
  })

  it('consulta e remove a chave pela Edge Function, sem acessar a chave armazenada', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'connected', message: 'Conectado.' }, error: null })
    await expect(obterEstadoGemini()).resolves.toEqual({ status: 'connected', message: 'Conectado.' })
    expect(invoke).toHaveBeenLastCalledWith('gemini', { body: { action: 'status' } })

    invoke.mockResolvedValueOnce({ data: { removed: true }, error: null })
    await removerChaveGemini()
    expect(invoke).toHaveBeenLastCalledWith('gemini', { body: { action: 'remove' } })
  })
})
