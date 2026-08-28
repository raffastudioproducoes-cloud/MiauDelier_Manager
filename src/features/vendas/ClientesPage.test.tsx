import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { ClientesPage } from './ClientesPage'

describe('ClientesPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra estado vazio quando não há clientes', async () => {
    render(<ToastProvider><ClientesPage /></ToastProvider>)
    expect(await screen.findByText(/nenhum cliente cadastrado/i)).toBeInTheDocument()
  })

  it('cadastra um cliente e ele aparece na lista', async () => {
    render(<ToastProvider><ClientesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome do cliente/i), { target: { value: 'Joana Silva' } })
    fireEvent.change(screen.getByLabelText(/contato/i), { target: { value: '21999990000' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar cliente/i }))

    await waitFor(() => expect(screen.getByText('Joana Silva')).toBeInTheDocument())
  })

  it('rejeita nome vazio antes de chamar o repositório', async () => {
    render(<ToastProvider><ClientesPage /></ToastProvider>)

    fireEvent.click(await screen.findByRole('button', { name: /cadastrar cliente/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/nome/i)
    expect(await db.clientes.count()).toBe(0)
  })
})
