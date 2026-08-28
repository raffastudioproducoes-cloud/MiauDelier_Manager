import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAuthStore } from '../../stores/authStore'
import { ToastProvider } from '../ui/ToastProvider'

const navegarMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navegarMock,
  useRouterState: () => ({ location: { pathname: '/' } }),
}))

const { AppShell } = await import('./AppShell')

describe('AppShell', () => {
  it('renderiza o conteúdo filho', () => {
    render(<ToastProvider><AppShell><p>Conteúdo da página</p></AppShell></ToastProvider>)
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument()
  })

  it('botão Sair chama sair() da store', () => {
    const sairSpy = vi.spyOn(useAuthStore.getState(), 'sair')
    render(<ToastProvider><AppShell><p>x</p></AppShell></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: /sair/i }))
    expect(sairSpy).toHaveBeenCalledOnce()
  })
})
