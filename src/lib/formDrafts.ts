import { db, type RascunhoFormulario } from '../db/schema'
import { getPerfilAtivo } from './perfisRepo'

const CAMPOS_SENSIVEIS = /(senha|password|token|secret|segredo|api.?key|chave.?api|credential|credencial)/i
const CAMPOS_EXCLUIDOS = new Set(['submit', 'button', 'reset', 'file', 'image', 'password', 'hidden'])

function chaveRascunho(usuarioId: string, perfilId: string, rota: string, formulario: string) {
  return `${usuarioId}:${perfilId}:${rota}:${formulario}`
}

export function coletarCamposPersistiveis(form: HTMLFormElement): Record<string, string | boolean> {
  const campos: Record<string, string | boolean> = {}
  for (const campo of Array.from(form.elements)) {
    if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement || campo instanceof HTMLTextAreaElement)) continue
    const nome = campo.name || campo.id
    if (!nome || CAMPOS_SENSIVEIS.test(nome) || CAMPOS_EXCLUIDOS.has(campo.type.toLowerCase())) continue
    if (campo instanceof HTMLInputElement && (campo.type === 'checkbox' || campo.type === 'radio')) {
      if (campo.type === 'radio' && !campo.checked) continue
      campos[nome] = campo.type === 'radio' ? campo.value : campo.checked
    } else {
      campos[nome] = campo.value
    }
  }
  return campos
}

export function restaurarCampos(form: HTMLFormElement, campos: Record<string, string | boolean>) {
  for (const campo of Array.from(form.elements)) {
    if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement || campo instanceof HTMLTextAreaElement)) continue
    const nome = campo.name || campo.id
    if (!nome || !(nome in campos) || CAMPOS_SENSIVEIS.test(nome) || CAMPOS_EXCLUIDOS.has(campo.type.toLowerCase())) continue
    const valor = campos[nome]
    if (campo instanceof HTMLInputElement && (campo.type === 'checkbox' || campo.type === 'radio')) {
      campo.checked = campo.type === 'radio' ? campo.value === valor : Boolean(valor)
    } else if (typeof valor === 'string') {
      campo.value = valor
    }
    campo.dispatchEvent(new Event('input', { bubbles: true }))
    campo.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

export async function obterContextoRascunho(usuarioId: string) {
  const perfil = await getPerfilAtivo()
  return { usuarioId, perfilId: perfil.id }
}

export async function salvarRascunhoFormulario(args: {
  usuarioId: string
  perfilId: string
  rota: string
  formulario: string
  campos: Record<string, string | boolean>
}) {
  const id = chaveRascunho(args.usuarioId, args.perfilId, args.rota, args.formulario)
  if (Object.keys(args.campos).length === 0) {
    await db.rascunhosFormulario.delete(id)
    return
  }
  await db.rascunhosFormulario.put({ ...args, id, atualizadoEm: new Date().toISOString() })
}

export async function carregarRascunhoFormulario(usuarioId: string, perfilId: string, rota: string, formulario: string) {
  return db.rascunhosFormulario.get(chaveRascunho(usuarioId, perfilId, rota, formulario))
}

export async function limparRascunhoFormulario(usuarioId: string, perfilId: string, rota: string, formulario: string) {
  await db.rascunhosFormulario.delete(chaveRascunho(usuarioId, perfilId, rota, formulario))
}

export type { RascunhoFormulario }
