import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('contrato da chave Gemini por usuaria', () => {
  it('busca a chave do usuario autenticado e nao usa uma chave compartilhada do ambiente', () => {
    const edgeFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/gemini/index.ts'), 'utf-8')

    expect(edgeFunction).toContain("get_user_gemini_key', { p_user_id: user.id }")
    expect(edgeFunction).not.toContain("Deno.env.get('GEMINI_API_KEY')")
  })
})
