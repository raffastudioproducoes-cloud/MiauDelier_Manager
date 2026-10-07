import type { MensagemIA } from '../../db/schema'

export class IaIndisponivelError extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'IaIndisponivelError'
  }
}

async function chamarGemini(contents: Array<{ role?: string; parts: Array<{ text: string }> }>): Promise<string> {
  void contents
  throw new IaIndisponivelError('Assistente de IA aguardando API segura no backend.')
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
