import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { definirChaveGemini } from '../ia/iaConfigRepo'
import { AssistenteIAPage } from './AssistenteIAPage'
import * as geminiClient from '../ia/geminiClient'

describe('AssistenteIAPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra aviso quando a chave do Gemini não está configurada', async () => {
    render(<ToastProvider><AssistenteIAPage /></ToastProvider>)
    await waitFor(() => expect(screen.getByText(/chave de api do gemini não configurada/i)).toBeInTheDocument())
  })

  it('envia pergunta, salva histórico e mostra a resposta em bolha', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.spyOn(geminiClient, 'pedirRespostaChat').mockResolvedValue('Deixe curar por 24 horas.')

    render(<ToastProvider><AssistenteIAPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/chave de api do gemini não configurada/i)).not.toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/sua pergunta/i), { target: { value: 'Quanto tempo de cura?' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => expect(screen.getByText(/deixe curar por 24 horas/i)).toBeInTheDocument())
    expect(screen.getByText('Quanto tempo de cura?')).toBeInTheDocument()
  })

  it('limpa a conversa após confirmar no modal', async () => {
    await definirChaveGemini('chave-de-teste')
    vi.spyOn(geminiClient, 'pedirRespostaChat').mockResolvedValue('Depende da resina.')

    render(<ToastProvider><AssistenteIAPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/chave de api do gemini não configurada/i)).not.toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/sua pergunta/i), { target: { value: 'Oi' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByText(/depende da resina/i)).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: /^enviar$/i })).toBeEnabled())

    fireEvent.click(screen.getByRole('button', { name: /limpar conversa/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.queryByText('Oi')).not.toBeInTheDocument())
  })
})
