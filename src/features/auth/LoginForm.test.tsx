import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'
import { clearSession } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const navegarMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navegarMock,
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
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

  it('mostra tela de login para conta já configurada com botão Entrar', async () => {
    // contaConfigurada: true → modoCadastro permanece false → botão submit = "Entrar"
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })
    render(<LoginForm />)
    // Verifica que o campo de senha existe e o botão de submit é "Entrar"
    expect(await screen.findByPlaceholderText('Digite sua senha')).toBeInTheDocument()
    // O submit button tem texto "Entrar" — usamos getAllByRole pois há 2 botões "Entrar"
    // (um no toggle e um no submit); ambos confirmam que o modo login está ativo
    const botoesEntrar = screen.getAllByRole('button', { name: /^Entrar$/ })
    expect(botoesEntrar.length).toBeGreaterThan(0)
  })

  it('alterna para modo cadastro ao clicar em "Criar Conta" e mostra botão Cadastrar', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })
    render(<LoginForm />)
    // Clica no botão "Criar Conta" para trocar de modo
    fireEvent.click(screen.getByRole('button', { name: /^Criar Conta$/ }))
    // Agora o botão de submit deve ser "Cadastrar"
    expect(await screen.findByRole('button', { name: /^Cadastrar$/ })).toBeInTheDocument()
  })

  it('cria conta e navega para a rota inicial', async () => {
    // contaConfigurada: false → formulário inicia no modo login por padrão
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({ data: { session: { user: { id: '123' } } }, error: null } as any)
    render(<LoginForm />)

    // Precisamos clicar em "Criar Conta" explicitamente
    fireEvent.click(screen.getByRole('button', { name: /^Criar Conta$/ }))

    const inputEmail = await screen.findByPlaceholderText('Digite seu usuário ou e-mail')
    const inputSenha = await screen.findByPlaceholderText('Digite sua senha')
    const inputConfirmar = await screen.findByPlaceholderText('Confirme sua senha')

    fireEvent.change(inputEmail, { target: { value: 'test@example.com' } })
    fireEvent.change(inputSenha, { target: { value: 'senha-forte-123' } })
    fireEvent.change(inputConfirmar, { target: { value: 'senha-forte-123' } })

    // Clica no botão de submit "Cadastrar"
    fireEvent.click(screen.getByRole('button', { name: /^Cadastrar$/ }))

    await waitFor(() => expect(navegarMock).toHaveBeenCalledWith({ to: '/' }))
    expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ emailRedirectTo: expect.stringMatching(/\/login$/) }),
    }))
  })

  it('inicia login Google retornando para a página de login atual', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({ data: { provider: 'google', url: 'https://accounts.google.com' }, error: null } as any)
    render(<LoginForm />)

    fireEvent.click(await screen.findByRole('button', { name: /^Google$/ }))

    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringMatching(/\/login$/) },
    }))
  })

  it('senha inválida no Supabase mostra erro e não navega', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    } as any)

    render(<LoginForm />)
    navegarMock.mockClear()

    const inputEmail = await screen.findByPlaceholderText('Digite seu usuário ou e-mail')
    const inputSenha = await screen.findByPlaceholderText('Digite sua senha')
    fireEvent.change(inputEmail, { target: { value: 'nao-existe@example.com' } })
    fireEvent.change(inputSenha, { target: { value: 'senha-errada' } })

    // Submit é o último botão "Entrar" (o toggle tem o mesmo texto)
    const botoesEntrar = screen.getAllByRole('button', { name: /^Entrar$/ })
    fireEvent.click(botoesEntrar[botoesEntrar.length - 1])

    expect(await screen.findByText(/conta não encontrada ou senha incorreta/i, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(navegarMock).not.toHaveBeenCalled()
  })

  it('login Supabase falho não cadastra conta automaticamente', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    } as any)
    render(<LoginForm />)

    fireEvent.change(await screen.findByPlaceholderText('Digite seu usuário ou e-mail'), { target: { value: 'nao-existe@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), { target: { value: 'senha-incorreta' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^Entrar$/ }).at(-1)!)

    expect(await screen.findByText(/use “criar conta”/i)).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
    expect(navegarMock).not.toHaveBeenCalled()
  })

  it('após login inexistente encaminha para cadastro preservando e-mail e senha', async () => {
    useAuthStore.setState({ autenticado: false, contaConfigurada: false })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    } as any)
    render(<LoginForm />)

    const inputEmail = await screen.findByPlaceholderText('Digite seu usuário ou e-mail')
    const inputSenha = screen.getByPlaceholderText('Digite sua senha')
    fireEvent.change(inputEmail, { target: { value: 'novo@example.com' } })
    fireEvent.change(inputSenha, { target: { value: 'senha-nova-123' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^Entrar$/ }).at(-1)!)

    expect(await screen.findByText(/conta não encontrada/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Cadastrar$/ }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByDisplayValue('novo@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('senha-nova-123')).toBeInTheDocument()
    expect(screen.getByText('Complete os dados para criar sua conta.')).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })
})
