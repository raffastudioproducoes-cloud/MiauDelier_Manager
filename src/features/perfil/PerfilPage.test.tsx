import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { PerfilPage } from './PerfilPage'

// Mock completo do Supabase — todos os métodos que CloudIdentityManager e perfisRepo usam
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      linkWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      unlinkIdentity: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}))

describe('PerfilPage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('renderiza o título da gestão de perfil e mostra o perfil ativo', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    expect(await screen.findByText('Gestão de Perfis de Ateliê')).toBeInTheDocument()
    // Aguarda o carregamento assíncrono dos perfis do Dexie
    expect(await screen.findAllByText(/Ateliê Principal/i)).not.toHaveLength(0)
    expect(await screen.findByText(/✓ Ativo Agora/i)).toBeInTheDocument()
  })

  it('abre formulário ao clicar em "+ Novo Ateliê"', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    // Aguarda o loading inicial
    await screen.findByText(/✓ Ativo Agora/i)
    fireEvent.click(screen.getByRole('button', { name: /\+ novo ateliê/i }))
    expect(screen.getByText('Cadastrar Novo Perfil de Ateliê')).toBeInTheDocument()
  })

  it('exibe opção de excluir conta e abre modal de confirmação ao clicar', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    await screen.findByText(/✓ Ativo Agora/i)

    const botoesExcluir = screen.getAllByRole('button', { name: /excluir conta/i })
    expect(botoesExcluir.length).toBeGreaterThan(0)

    fireEvent.click(botoesExcluir[0])
    expect(screen.getByText(/Excluir Conta e Dados Definitivamente\?/i)).toBeInTheDocument()
  })

  it('exibe botão de excluir perfil ao editar o perfil ativo', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    await screen.findByText(/✓ Ativo Agora/i)

    const botaoEditar = screen.getByRole('button', { name: /editar perfil/i })
    fireEvent.click(botaoEditar)

    await waitFor(() => expect(screen.getByText('Editar Perfil do Ateliê')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /excluir este perfil/i })).toBeInTheDocument()
  })
})
