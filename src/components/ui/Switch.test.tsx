import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renderiza marcado quando checked é true', () => {
    render(<Switch id="notificacoes" label="Notificações" checked onChange={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAttribute('aria-checked', 'true')
  })

  it('renderiza desmarcado quando checked é false', () => {
    render(<Switch id="notificacoes" label="Notificações" checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAttribute('aria-checked', 'false')
  })

  it('chama onChange com o novo estado ao clicar', () => {
    const aoMudar = vi.fn()
    render(<Switch id="notificacoes" label="Notificações" checked={false} onChange={aoMudar} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Notificações' }))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })
})
