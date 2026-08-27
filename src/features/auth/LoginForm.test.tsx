import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'
import { setupAccount, clearSession } from '../../lib/auth'

const navegarMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navegarMock,
}))

const { LoginForm } = await import('./LoginForm')

describe('LoginForm', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
    useAuthStore.setState({ autenticado: false, contaConfigurada: null })
    navegarMock.mockClear()
  })

  it('mostra formulário de criação de conta quando não há conta configurada', async () => {
    render(<LoginForm />)
    expect(await screen.findByRole('heading', { name: /criar senha/i })).toBeInTheDocument()
  })

  it('cria conta e navega para a rota inicial', async () => {
    render(<LoginForm />)
    const input = await screen.findByLabelText(/senha/i)
    fireEvent.change(input, { target: { value: 'senha-forte-123' } })
    fireEvent.click(screen.getByRole('button', { name: /criar senha/i }))

    await waitFor(() => expect(navegarMock).toHaveBeenCalledWith({ to: '/' }))
  })

  it('conta já configurada + senha errada: mostra erro e não navega nem abre sessão', async () => {
    await setupAccount('senha-certa')
    clearSession()
    useAuthStore.setState({ autenticado: false, contaConfigurada: true })

    render(<LoginForm />)
    const input = await screen.findByLabelText(/senha/i)
    fireEvent.change(input, { target: { value: 'senha-errada' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/senha incorreta/i)
    expect(navegarMock).not.toHaveBeenCalled()
  })

  it('entrar lança exceção (conta corrompida): mostra erro distinto e não navega', async () => {
    await setupAccount('senha-certa')
    clearSession()
    useAuthStore.setState({
      autenticado: false,
      contaConfigurada: true,
      entrar: async () => {
        throw new Error('Conta corrompida.')
      },
    })

    render(<LoginForm />)
    const input = await screen.findByLabelText(/senha/i)
    fireEvent.change(input, { target: { value: 'qualquer-senha' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/conta corrompida/i)
    expect(alerta).not.toHaveTextContent(/senha incorreta/i)
    expect(navegarMock).not.toHaveBeenCalled()
  })
})
