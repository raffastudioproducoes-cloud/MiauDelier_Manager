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
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null })
    })
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

  it('mostra tela de login padrão primeiro', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    render(<LoginForm />)
    expect(await screen.findByRole('tab', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar na conta/i })).toBeInTheDocument()
  })

  it('mostra aba de criação de conta', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('tab', { name: /criar conta/i }))
    expect(await screen.findByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })

  it('cria conta e navega para a rota inicial', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({ data: { session: { user: { id: '123' } } }, error: null } as any)
    render(<LoginForm />)
    
    fireEvent.click(screen.getByRole('tab', { name: /criar conta/i }))
    
    const inputEmail = await screen.findByPlaceholderText('seu@email.com')
    const inputSenha = await screen.findByPlaceholderText('Crie uma senha forte')
    const inputConfirmar = await screen.findByPlaceholderText('Repita a senha')
    
    fireEvent.change(inputEmail, { target: { value: 'test@example.com' } })
    fireEvent.change(inputSenha, { target: { value: 'senha-forte-123' } })
    fireEvent.change(inputConfirmar, { target: { value: 'senha-forte-123' } })
    
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => expect(navegarMock).toHaveBeenCalledWith({ to: '/' }))
  })

  it('conta já configurada + senha errada: mostra erro e não navega nem abre sessão', async () => {
    await setupAccount('senha-certa')
    clearSession()
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })

    render(<LoginForm />)
    
    const inputEmail = await screen.findByPlaceholderText('seu@email.com')
    const input = await screen.findByPlaceholderText('Sua senha')
    
    fireEvent.change(inputEmail, { target: { value: 'test@example.com' } })
    fireEvent.change(input, { target: { value: 'senha-errada' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar na conta/i }))

    expect(await screen.findByText(/senha ou e-mail incorretos/i, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(navegarMock).not.toHaveBeenCalled()
  })
})
