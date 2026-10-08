import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke } } }))

const { configurarChaveGemini, pedirDicaIA } = await import('./geminiClient')

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
})
