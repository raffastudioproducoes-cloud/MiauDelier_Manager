export interface PerfilAtelie {
  id: string
  nome: string
  criadoEm: string
}

export const RESERVED_DEFAULT_PROFILE_ID = 'padrao'
const STORAGE_KEY_PERFIS = 'miaudelier_perfis_atelie'
const STORAGE_KEY_PERFIL_ATIVO = 'miaudelier_perfil_ativo'

const PERFIL_PADRAO: PerfilAtelie = {
  id: RESERVED_DEFAULT_PROFILE_ID,
  nome: 'Ateliê Principal',
  criadoEm: new Date().toISOString(),
}

export function listarPerfis(): PerfilAtelie[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERFIS)
    if (!raw) {
      return [PERFIL_PADRAO]
    }
    const perfis: PerfilAtelie[] = JSON.parse(raw)
    if (!perfis.some((p) => p.id === RESERVED_DEFAULT_PROFILE_ID)) {
      perfis.unshift(PERFIL_PADRAO)
    }
    return perfis
  } catch {
    return [PERFIL_PADRAO]
  }
}

export function getPerfilAtivo(): PerfilAtelie {
  try {
    const perfis = listarPerfis()
    const ativoId = localStorage.getItem(STORAGE_KEY_PERFIL_ATIVO)
    const encontrado = perfis.find((p) => p.id === ativoId)
    return encontrado || perfis[0] || PERFIL_PADRAO
  } catch {
    return PERFIL_PADRAO
  }
}

export function criarPerfil(nome: string): PerfilAtelie {
  const perfis = listarPerfis()
  const novoPerfil: PerfilAtelie = {
    id: `atelie_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim() || 'Novo Ateliê',
    criadoEm: new Date().toISOString(),
  }
  perfis.push(novoPerfil)
  localStorage.setItem(STORAGE_KEY_PERFIS, JSON.stringify(perfis))
  return novoPerfil
}

export function selecionarPerfil(id: string): void {
  const perfis = listarPerfis()
  const existe = perfis.some((p) => p.id === id)
  if (existe) {
    localStorage.setItem(STORAGE_KEY_PERFIL_ATIVO, id)
  }
}

export function getDbNameForPerfil(perfilId?: string): string {
  const id = perfilId || getPerfilAtivo().id
  if (id === RESERVED_DEFAULT_PROFILE_ID) {
    return 'MiauDelierManager'
  }
  return `MiauDelierManager__${id}`
}
