import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') return response({}, 204, origin)
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin)

  const body = await request.json().catch(() => null) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return response({ provider: null }, 200, origin)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) return response({ error: 'Server configuration error' }, 500, origin)

  const admin = createClient(url, serviceRoleKey)
  const { data, error } = await admin.rpc('get_login_provider_hint', { p_email: email })
  if (error) return response({ error: 'Could not resolve login provider' }, 500, origin)
  return response({ provider: data === 'google' || data === 'apple' ? data : null }, 200, origin)
})
