import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount, getSessionKey, clearSession } from '../../lib/auth'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
  })

  it('mostra formulário de criação de conta quando não há conta configurada', async () => {
    render(<LoginForm />)
    expect(await screen.findByRole('heading', { name: /criar senha/i })).toBeInTheDocument()
  })

  it('cria conta e mostra mensagem de sucesso', async () => {
    render(<LoginForm />)
    const input = await screen.findByLabelText(/senha/i)
    fireEvent.change(input, { target: { value: 'senha-forte-123' } })
    fireEvent.click(screen.getByRole('button', { name: /criar senha/i }))

    await waitFor(() => expect(screen.getByText(/conta criada/i)).toBeInTheDocument())
  })

  it('conta já configurada + senha errada: mostra erro e não abre sessão', async () => {
    await setupAccount('senha-correta-123')
    clearSession()

    render(<LoginForm />)
    const input = await screen.findByLabelText(/senha/i)
    fireEvent.change(input, { target: { value: 'senha-errada-999' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(getSessionKey()).toBeNull()
  })
})
