import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'
import { setupAccount, clearSession } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const navegarMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navegarMock,
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    }
  }
}))

const { LoginForm } = await import('./LoginForm')

describe('LoginForm', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
    useAuthStore.setState({ autenticado: false, contaConfigurada: null })
    navegarMock.mockClear()
    vi.clearAllMocks()
  })

  const mockSession = () => {
    // Simula que o usuário logou no Supabase
    const sessaoMock = { user: { email: 'test@example.com' } }
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: sessaoMock } } as any)
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce((callback: any) => {
      callback('SIGNED_IN', sessaoMock)
      return { data: { subscription: { unsubscribe: vi.fn() } } } as any
    })
  }

  it('mostra tela de login do Supabase primeiro', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    render(<LoginForm />)
    expect(await screen.findByRole('heading', { name: /identifique-se/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar código/i })).toBeInTheDocument()
  })

  it('mostra formulário de criação de cofre local quando nuvem aprovada mas sem cofre', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    mockSession()
    render(<LoginForm />)
    expect(await screen.findByRole('heading', { name: /crie seu cofre/i })).toBeInTheDocument()
  })

  it('cria conta e navega para a rota inicial', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    mockSession()
    render(<LoginForm />)
    
    const inputSenha = await screen.findByLabelText(/^senha do cofre$/i)
    const inputConfirmar = await screen.findByLabelText(/confirmar senha/i)
    
    fireEvent.change(inputSenha, { target: { value: 'senha-forte-123' } })
    fireEvent.change(inputConfirmar, { target: { value: 'senha-forte-123' } })
    
    fireEvent.click(screen.getByRole('button', { name: /salvar e acessar/i }))

    await waitFor(() => expect(navegarMock).toHaveBeenCalledWith({ to: '/' }))
  })

  it('conta já configurada + senha errada: mostra erro e não navega nem abre sessão', async () => {
    await setupAccount('senha-certa')
    clearSession()
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })
    mockSession()

    render(<LoginForm />)
    
    const input = await screen.findByLabelText(/^senha do cofre$/i)
    fireEvent.change(input, { target: { value: 'senha-errada' } })
    fireEvent.click(screen.getByRole('button', { name: /decifrar dados/i }))

    expect(await screen.findByText(/senha do cofre incorreta/i, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(navegarMock).not.toHaveBeenCalled()
  })
})
