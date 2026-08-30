import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => (
    <a href={to.replace('$clienteId', params?.clienteId ?? '')} {...props}>{children}</a>
  ),
}))

const { ClientesPage } = await import('./ClientesPage')

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

  it('edita um cliente existente', async () => {
    render(<ToastProvider><ClientesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome do cliente/i), { target: { value: 'Joana' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar cliente/i }))
    await waitFor(() => expect(screen.getByText('Joana')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }))
    fireEvent.change(screen.getByLabelText(/nome do cliente/i), { target: { value: 'Joana Silva' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect(screen.getByText('Joana Silva')).toBeInTheDocument())
  })

  it('exclui um cliente após confirmação', async () => {
    render(<ToastProvider><ClientesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome do cliente/i), { target: { value: 'Joana' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar cliente/i }))
    await waitFor(() => expect(screen.getByText('Joana')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(screen.queryByText('Joana')).not.toBeInTheDocument())
    expect(await db.clientes.count()).toBe(0)
  })

  it('filtra clientes pelo campo de busca', async () => {
    render(<ToastProvider><ClientesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome do cliente/i), { target: { value: 'Joana' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar cliente/i }))
    await waitFor(() => expect(screen.getByText('Joana')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/nome do cliente/i), { target: { value: 'Marcos' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar cliente/i }))
    await waitFor(() => expect(screen.getByText('Marcos')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/buscar cliente/i), { target: { value: 'marc' } })

    expect(screen.queryByText('Joana')).not.toBeInTheDocument()
    expect(screen.getByText('Marcos')).toBeInTheDocument()
  })
})
