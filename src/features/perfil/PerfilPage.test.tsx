import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { PerfilPage } from './PerfilPage'

// setupAccount chama supabase.from(...).upsert(...) — precisa de mock
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
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

describe('PerfilPage', () => {
  beforeEach(async () => {
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

    expect(screen.getByText('Gestão de Perfis de Ateliê')).toBeInTheDocument()
    expect(screen.getAllByText(/Ateliê Principal/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/✓ Ativo Agora/i)).toBeInTheDocument()
  })

  it('abre formulário ao clicar em "+ Novo Ateliê"', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /\+ novo ateliê/i }))
    expect(screen.getByText('Cadastrar Novo Perfil de Ateliê')).toBeInTheDocument()
  })

  it('exibe opção de excluir conta e abre modal de confirmação ao clicar', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    // Botão no card do perfil ativo (perfil padrão = "🗑️ Excluir Conta")
    const botoesExcluir = screen.getAllByRole('button', { name: /excluir conta/i })
    expect(botoesExcluir.length).toBeGreaterThan(0)

    fireEvent.click(botoesExcluir[0])
    // Título do modal definido em PerfilPage.tsx linha 419
    expect(screen.getByText(/Excluir Conta e Dados Definitivamente\?/i)).toBeInTheDocument()
  })

  it('exibe botão de excluir perfil ao editar o perfil ativo', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    // Botão "✏️ Editar Perfil" do card de destaque do perfil ativo
    const botaoEditar = screen.getByRole('button', { name: /editar perfil/i })
    fireEvent.click(botaoEditar)

    // Form título quando editando
    expect(screen.getByText('Editar Perfil do Ateliê')).toBeInTheDocument()
    // Botão de exclusão dentro do form de edição (linha 326 de PerfilPage.tsx)
    expect(screen.getByRole('button', { name: /excluir este perfil/i })).toBeInTheDocument()
  })
})
