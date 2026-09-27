import Dexie from 'dexie'

export interface PerfilAtelie {
  id: string
  nome: string
  nomeDono?: string
  emailDono?: string
  endereco?: string
  documento?: string
  telefone?: string
  criadoEm: string
}

export interface DadosNovoPerfil {
  nome: string
  nomeDono?: string
  emailDono?: string
  endereco?: string
  documento?: string
  telefone?: string
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

export function criarPerfil(dados: string | DadosNovoPerfil): PerfilAtelie {
  const perfis = listarPerfis()
  const info: DadosNovoPerfil = typeof dados === 'string' ? { nome: dados } : dados
  const novoPerfil: PerfilAtelie = {
    id: `atelie_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    nome: info.nome.trim() || 'Novo Ateliê',
    nomeDono: info.nomeDono?.trim() || undefined,
    emailDono: info.emailDono?.trim() || undefined,
    endereco: info.endereco?.trim() || undefined,
    documento: info.documento?.trim() || undefined,
    telefone: info.telefone?.trim() || undefined,
    criadoEm: new Date().toISOString(),
  }
  perfis.push(novoPerfil)
  localStorage.setItem(STORAGE_KEY_PERFIS, JSON.stringify(perfis))
  return novoPerfil
}

export function atualizarPerfil(id: string, dados: Partial<Omit<PerfilAtelie, 'id' | 'criadoEm'>>): PerfilAtelie {
  const perfis = listarPerfis()
  const index = perfis.findIndex((p) => p.id === id)
  if (index === -1) {
    throw new Error('Perfil de ateliê não encontrado.')
  }
  const perfilAtualizado: PerfilAtelie = {
    ...perfis[index],
    nome: dados.nome !== undefined ? (dados.nome.trim() || perfis[index].nome) : perfis[index].nome,
    nomeDono: dados.nomeDono !== undefined ? dados.nomeDono.trim() : perfis[index].nomeDono,
    emailDono: dados.emailDono !== undefined ? dados.emailDono.trim() : perfis[index].emailDono,
    endereco: dados.endereco !== undefined ? dados.endereco.trim() : perfis[index].endereco,
    documento: dados.documento !== undefined ? dados.documento.trim() : perfis[index].documento,
    telefone: dados.telefone !== undefined ? dados.telefone.trim() : perfis[index].telefone,
  }
  perfis[index] = perfilAtualizado
  localStorage.setItem(STORAGE_KEY_PERFIS, JSON.stringify(perfis))
  return perfilAtualizado
}

export async function excluirPerfil(id: string): Promise<void> {
  if (id === RESERVED_DEFAULT_PROFILE_ID) {
    throw new Error('Não é possível excluir o perfil de ateliê principal.')
  }
  const perfis = listarPerfis()
  const novosPerfis = perfis.filter((p) => p.id !== id)
  if (novosPerfis.length === perfis.length) {
    throw new Error('Perfil não encontrado para exclusão.')
  }
  localStorage.setItem(STORAGE_KEY_PERFIS, JSON.stringify(novosPerfis))

  const ativoId = localStorage.getItem(STORAGE_KEY_PERFIL_ATIVO)
  if (ativoId === id) {
    localStorage.setItem(STORAGE_KEY_PERFIL_ATIVO, RESERVED_DEFAULT_PROFILE_ID)
  }

  try {
    const dbName = getDbNameForPerfil(id)
    await Dexie.delete(dbName)
  } catch {
    // ignorar erro ao apagar DB
  }
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
