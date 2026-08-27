import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { FormasPage } from './FormasPage'

describe('FormasPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('calcula o volume ao preencher as dimensões de uma forma cilíndrica', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^raio/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/^altura/i), { target: { value: '2' } })

    await waitFor(() => expect(screen.getByText(/volume calculado/i).closest('p')?.textContent).toMatch(/157/))
  })

  it('cadastra uma forma e ela aparece na lista', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Porta-copo' } })
    fireEvent.change(screen.getByLabelText(/^raio/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/^altura/i), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))

    await waitFor(() => expect(screen.getByText('Porta-copo')).toBeInTheDocument())
  })
})
