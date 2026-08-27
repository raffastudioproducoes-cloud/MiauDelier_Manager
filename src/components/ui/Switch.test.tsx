import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renderiza marcado quando marcado é true', () => {
    render(<Switch id="notificacoes" rotulo="Notificações" marcado aoMudar={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAttribute('aria-checked', 'true')
  })

  it('renderiza desmarcado quando marcado é false', () => {
    render(<Switch id="notificacoes" rotulo="Notificações" marcado={false} aoMudar={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAttribute('aria-checked', 'false')
  })

  it('chama aoMudar com o novo estado ao clicar', () => {
    const aoMudar = vi.fn()
    render(<Switch id="notificacoes" rotulo="Notificações" marcado={false} aoMudar={aoMudar} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Notificações' }))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })

  it('chama aoMudar apenas uma vez ao clicar no texto do rótulo', () => {
    const aoMudar = vi.fn()
    render(<Switch id="notificacoes" rotulo="Notificações" marcado={false} aoMudar={aoMudar} />)
    fireEvent.click(screen.getByText('Notificações'))
    expect(aoMudar).toHaveBeenCalledTimes(1)
  })
})
