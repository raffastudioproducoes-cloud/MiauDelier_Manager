import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke } } }))

const { pedirDicaIA } = await import('./geminiClient')

describe('geminiClient', () => {
  it('mostra a causa segura devolvida pela Edge Function', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { context: new Response(JSON.stringify({ error: 'A chave Gemini e invalida ou nao tem acesso a este modelo.' })) },
    })

    await expect(pedirDicaIA('teste')).rejects.toThrow('A chave Gemini e invalida ou nao tem acesso a este modelo.')
  })
})
