import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../db/schema'
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

// Supabase não é necessário nas operações locais do perfisRepo
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}))

describe('perfisRepo', () => {
  beforeEach(async () => {
    localStorage.clear()
    await db.delete()
    await db.open()
  })

  it('deve retornar perfil padrão inicialmente', async () => {
    const perfis = await listarPerfis()
    expect(perfis).toHaveLength(1)
    expect(perfis[0].id).toBe(RESERVED_DEFAULT_PROFILE_ID)
    expect(perfis[0].nome).toBe('Ateliê Principal')

    const ativo = await getPerfilAtivo()
    expect(ativo.id).toBe(RESERVED_DEFAULT_PROFILE_ID)
    expect(getDbNameForPerfil(ativo.id)).toBe('MiauDelierManager')
  })

  it('deve criar novos perfis de ateliê com metadados completos e IDs únicos', async () => {
    const perfil1 = await criarPerfil({
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

    const perfis = await listarPerfis()
    expect(perfis).toHaveLength(2)
  })

  it('deve atualizar informações de um perfil existente', async () => {
    const perfil = await criarPerfil('Ateliê Inicial')
    const atualizado = await atualizarPerfil(perfil.id, {
      nome: 'Ateliê Atualizado',
      nomeDono: 'Maria Oliveira',
      emailDono: 'maria@atelie.com',
    })
    expect(atualizado.nome).toBe('Ateliê Atualizado')
    expect(atualizado.nomeDono).toBe('Maria Oliveira')

    const perfis = await listarPerfis()
    const encontrado = perfis.find((p) => p.id === perfil.id)
    expect(encontrado?.nome).toBe('Ateliê Atualizado')
  })

  it('deve excluir um perfil de ateliê secundário', async () => {
    const perfil = await criarPerfil('Ateliê Temporário')
    expect(await listarPerfis()).toHaveLength(2)

    await excluirPerfil(perfil.id)
    expect(await listarPerfis()).toHaveLength(1)
  })

  it('não deve permitir excluir o perfil principal (padrao)', async () => {
    await expect(excluirPerfil(RESERVED_DEFAULT_PROFILE_ID)).rejects.toThrow(
      'Não é possível excluir o perfil de ateliê principal.',
    )
  })

  it('deve permitir alternar entre perfis de ateliê', async () => {
    const perfil2 = await criarPerfil('Ateliê Secundário')
    selecionarPerfil(perfil2.id)

    const ativo = await getPerfilAtivo()
    expect(ativo.id).toBe(perfil2.id)
    expect(ativo.nome).toBe('Ateliê Secundário')
  })
})
