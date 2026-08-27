import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../stores/authStore'

const navegarMock = vi.fn()
let caminhoAtual = '/'
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navegarMock,
  useRouterState: () => ({ location: { pathname: caminhoAtual } }),
}))

const { RequireAuth } = await import('./RequireAuth')

describe('RequireAuth', () => {
  beforeEach(() => {
    navegarMock.mockClear()
    caminhoAtual = '/'
    useAuthStore.setState({ autenticado: false, contaConfigurada: null })
  })

  it('redireciona para /login quando não autenticado fora de /login', () => {
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>,
    )
    expect(navegarMock).toHaveBeenCalledWith({ to: '/login' })
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('não redireciona quando já está em /login', () => {
    caminhoAtual = '/login'
    render(
      <RequireAuth>
        <p>Tela de login</p>
      </RequireAuth>,
    )
    expect(navegarMock).not.toHaveBeenCalled()
  })

  it('não redireciona quando autenticado', () => {
    useAuthStore.setState({ autenticado: true, contaConfigurada: true })
    render(
      <RequireAuth>
        <p>Conteúdo protegido</p>
      </RequireAuth>,
    )
    expect(navegarMock).not.toHaveBeenCalled()
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })
})
