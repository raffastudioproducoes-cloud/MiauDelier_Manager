import { describe, it, expect, beforeEach } from 'vitest'
import {
  listarPerfis,
  criarPerfil,
  atualizarPerfil,
  excluirPerfil,
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

  it('deve criar novos perfis de ateliê com metadados completos e IDs únicos', () => {
    const perfil1 = criarPerfil({
      nome: 'Ateliê Resinas Mágicas',
      nomeDono: 'Rafaela Silva',
      emailDono: 'rafaela@atelie.com',
      documento: '12.345.678/0001-99',
      telefone: '(11) 99999-8888',
      endereco: 'Rua das Flores, 123 - SP',
    })
    expect(perfil1.nome).toBe('Ateliê Resinas Mágicas')
    expect(perfil1.nomeDono).toBe('Rafaela Silva')
    expect(perfil1.emailDono).toBe('rafaela@atelie.com')
    expect(perfil1.documento).toBe('12.345.678/0001-99')
    expect(perfil1.telefone).toBe('(11) 99999-8888')
    expect(perfil1.endereco).toBe('Rua das Flores, 123 - SP')
    expect(perfil1.id).toBeDefined()
    expect(getDbNameForPerfil(perfil1.id)).toBe(`MiauDelierManager__${perfil1.id}`)

    const perfis = listarPerfis()
    expect(perfis).toHaveLength(2)
  })

  it('deve atualizar informações de um perfil existente', () => {
    const perfil = criarPerfil('Ateliê Inicial')
    const atualizado = atualizarPerfil(perfil.id, {
      nome: 'Ateliê Atualizado',
      nomeDono: 'Maria Oliveira',
      emailDono: 'maria@atelie.com',
    })
    expect(atualizado.nome).toBe('Ateliê Atualizado')
    expect(atualizado.nomeDono).toBe('Maria Oliveira')

    const perfis = listarPerfis()
    const encontrado = perfis.find((p) => p.id === perfil.id)
    expect(encontrado?.nome).toBe('Ateliê Atualizado')
  })

  it('deve excluir um perfil de ateliê secundário', async () => {
    const perfil = criarPerfil('Ateliê Temporário')
    expect(listarPerfis()).toHaveLength(2)

    await excluirPerfil(perfil.id)
    expect(listarPerfis()).toHaveLength(1)
  })

  it('não deve permitir excluir o perfil principal (padrao)', async () => {
    await expect(excluirPerfil(RESERVED_DEFAULT_PROFILE_ID)).rejects.toThrow(
      'Não é possível excluir o perfil de ateliê principal.',
    )
  })

  it('deve permitir alternar entre perfis de ateliê', () => {
    const perfil2 = criarPerfil('Ateliê Secundário')
    selecionarPerfil(perfil2.id)

    const ativo = getPerfilAtivo()
    expect(ativo.id).toBe(perfil2.id)
    expect(ativo.nome).toBe('Ateliê Secundário')
  })
})
