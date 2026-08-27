import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAuthStore } from '../../stores/authStore'

const navegarMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navegarMock,
  useRouterState: () => ({ location: { pathname: '/' } }),
}))

const { AppShell } = await import('./AppShell')

describe('AppShell', () => {
  it('renderiza o conteúdo filho', () => {
    render(<AppShell><p>Conteúdo da página</p></AppShell>)
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument()
  })

  it('botão Sair chama sair() da store', () => {
    const sairSpy = vi.spyOn(useAuthStore.getState(), 'sair')
    render(<AppShell><p>x</p></AppShell>)
    fireEvent.click(screen.getByRole('button', { name: /sair/i }))
    expect(sairSpy).toHaveBeenCalledOnce()
  })
})
