import { describe, it, expect, beforeEach } from 'vitest'
import {
  listarPerfis,
  criarPerfil,
  getPerfilAtivo,
  selecionarPerfil,
  getDbNameForPerfil,
  RESERVED_DEFAULT_PROFILE_ID,
} from './perfisRepo'

describe('perfisRepo', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('deve retornar perfil padrão inicialmente', () => {
    const perfis = listarPerfis()
    expect(perfis).toHaveLength(1)
    expect(perfis[0].id).toBe(RESERVED_DEFAULT_PROFILE_ID)
    expect(perfis[0].nome).toBe('Ateliê Principal')

    const ativo = getPerfilAtivo()
    expect(ativo.id).toBe(RESERVED_DEFAULT_PROFILE_ID)
    expect(getDbNameForPerfil(ativo.id)).toBe('MiauDelierManager')
  })

  it('deve criar novos perfis de ateliê com IDs únicos', () => {
    const perfil1 = criarPerfil('Ateliê Resinas Mágicas')
    expect(perfil1.nome).toBe('Ateliê Resinas Mágicas')
    expect(perfil1.id).toBeDefined()
    expect(getDbNameForPerfil(perfil1.id)).toBe(`MiauDelierManager__${perfil1.id}`)

    const perfis = listarPerfis()
    expect(perfis).toHaveLength(2)
  })

  it('deve permitir alternar entre perfis de ateliê', () => {
    const perfil2 = criarPerfil('Ateliê Secundário')
    selecionarPerfil(perfil2.id)

    const ativo = getPerfilAtivo()
    expect(ativo.id).toBe(perfil2.id)
    expect(ativo.nome).toBe('Ateliê Secundário')
  })
})
