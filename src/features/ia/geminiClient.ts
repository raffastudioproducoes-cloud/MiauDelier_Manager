import type { MensagemIA } from '../../db/schema'
import { supabase } from '../../lib/supabase'

export class IaIndisponivelError extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'IaIndisponivelError'
  }
}

export type StatusGemini = 'connected' | 'disconnected' | 'problem'

export interface EstadoGemini {
  status: StatusGemini
  message: string
}

async function mensagemErroDaFunction(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object' || !('context' in error)) return null
  const context = error.context
  if (!(context instanceof Response)) return null
  const body = await context.clone().json().catch(() => null) as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : null
}

async function chamarGemini(contents: Array<{ role?: string; parts: Array<{ text: string }> }>): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>('gemini', {
    body: { action: 'generate', contents },
  })

  if (error) {
    throw new IaIndisponivelError(await mensagemErroDaFunction(error) ?? 'Não foi possível consultar o assistente agora.')
  }
  if (!data?.text) throw new IaIndisponivelError(data?.error ?? 'Configure uma chave Gemini válida nas configurações.')
  return data.text
}

export async function configurarChaveGemini(apiKey: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>('gemini', {
    body: { action: 'configure', apiKey },
  })

  if (error || data?.error) {
    throw new IaIndisponivelError(data?.error ?? 'Não foi possível salvar a chave Gemini.')
  }
}

export async function obterEstadoGemini(): Promise<EstadoGemini> {
  const { data, error } = await supabase.functions.invoke<Partial<EstadoGemini> & { error?: string }>('gemini', {
    body: { action: 'status' },
  })

  if (error || data?.error || !data?.status || !data.message) {
    throw new IaIndisponivelError(data?.error ?? await mensagemErroDaFunction(error) ?? 'Não foi possível verificar a chave Gemini.')
  }
  return { status: data.status, message: data.message }
}

export async function removerChaveGemini(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>('gemini', {
    body: { action: 'remove' },
  })

  if (error || data?.error) {
    throw new IaIndisponivelError(data?.error ?? await mensagemErroDaFunction(error) ?? 'Não foi possível remover a chave Gemini.')
  }
}

export async function pedirDicaIA(pergunta: string): Promise<string> {
  return chamarGemini([{ role: 'user', parts: [{ text: pergunta }] }])
}

export async function pedirRespostaChat(historico: MensagemIA[], novaPergunta: string): Promise<string> {
  const rawHistory = [
    ...historico.map((mensagem) => ({
      role: mensagem.papel === 'usuario' ? 'user' : 'model',
      text: mensagem.texto,
    })),
    { role: 'user', text: novaPergunta },
  ]

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  // Agrupar mensagens subsequentes do mesmo autor (previne erro 400 do Gemini)
  for (const item of rawHistory) {
    const last = contents[contents.length - 1]
    if (last && last.role === item.role) {
      last.parts[0].text += '\n\n' + item.text
    } else {
      contents.push({ role: item.role, parts: [{ text: item.text }] })
    }
  }

  // Limite de comandos (últimas 40 interações - equivalente a 20 idas e voltas)
  const contentsLimitado = contents.slice(-40)
  if (contentsLimitado.length > 0 && contentsLimitado[0].role === 'model') {
    contentsLimitado.unshift({ role: 'user', parts: [{ text: '(O usuário abriu o aplicativo e você enviou uma mensagem de boas-vindas com o resumo do ateliê.)' }] })
  }

  return chamarGemini(contentsLimitado)
}
