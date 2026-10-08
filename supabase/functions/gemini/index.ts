import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

type GeminiContent = { role?: string; parts: Array<{ text: string }> }

const allowedOrigins = new Set([
  'https://miaudelier-manager-testes.pages.dev',
  'https://raffastudioproducoes-cloud.github.io',
  'http://localhost:5173',
])

function response(body: Record<string, unknown>, status = 200, origin?: string | null) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
  }
  // HTTP 204 forbids a response body; preflight otherwise fails before the POST.
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') {
    return response({}, 204, origin)
  }
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return response({ error: 'Unauthorized' }, 401, origin)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) return response({ error: 'Server configuration error' }, 500, origin)

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return response({ error: 'Unauthorized' }, 401, origin)

  const body = await request.json() as { action?: string; apiKey?: string; contents?: GeminiContent[] }
  const admin = createClient(url, serviceRoleKey)

  if (body.action === 'configure') {
    const apiKey = body.apiKey?.trim()
    if (!apiKey || apiKey.length < 20 || apiKey.length > 512) {
      return response({ error: 'Informe uma chave Gemini válida.' }, 400, origin)
    }
    const { error } = await admin.rpc('set_user_gemini_key', { p_user_id: user.id, p_key: apiKey })
    if (error) return response({ error: 'Não foi possível salvar a chave Gemini.' }, 500, origin)
    return response({ configured: true }, 200, origin)
  }

  if (body.action !== 'generate' || !Array.isArray(body.contents) || body.contents.length === 0) {
    return response({ error: 'Invalid request' }, 400, origin)
  }

  const { data: apiKey, error: keyError } = await admin.rpc('get_user_gemini_key', { p_user_id: user.id })
  if (keyError || !apiKey) return response({ error: 'Configure uma chave Gemini nas configurações para usar o assistente.' }, 400, origin)

  const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: body.contents }),
  })
  if (!geminiResponse.ok) return response({ error: 'Gemini não respondeu à solicitação.' }, 502, origin)

  const geminiData = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = geminiData.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
  if (!text) return response({ error: 'Gemini não retornou uma resposta.' }, 502, origin)
  return response({ text }, 200, origin)
})
