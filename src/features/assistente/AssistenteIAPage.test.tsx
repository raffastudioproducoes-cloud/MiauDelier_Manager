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

  it('não duplica a pergunta atual dentro do histórico enviado ao Gemini', async () => {
    await definirChaveGemini('chave-de-teste')
    const mockChat = vi.spyOn(geminiClient, 'pedirRespostaChat').mockResolvedValue('Resposta 1')

    render(<ToastProvider><AssistenteIAPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/chave de api do gemini não configurada/i)).not.toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/sua pergunta/i), { target: { value: 'Primeira pergunta' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByText(/resposta 1/i)).toBeInTheDocument())

    // Primeira chamada: histórico deve estar vazio (nenhuma mensagem anterior)
    const [historicoChamada1, perguntaChamada1] = mockChat.mock.calls[0]
    expect(historicoChamada1).toHaveLength(0)
    expect(perguntaChamada1).toBe('Primeira pergunta')

    mockChat.mockResolvedValue('Resposta 2')
    await waitFor(() => expect(screen.getByRole('button', { name: /^enviar$/i })).toBeEnabled())
    fireEvent.change(screen.getByLabelText(/sua pergunta/i), { target: { value: 'Segunda pergunta' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByText(/resposta 2/i)).toBeInTheDocument())

    // Segunda chamada: histórico deve conter só a pergunta 1 + resposta 1, NUNCA a "Segunda pergunta"
    const [historicoChamada2, perguntaChamada2] = mockChat.mock.calls[1]
    expect(perguntaChamada2).toBe('Segunda pergunta')
    expect(historicoChamada2).toHaveLength(2)
    expect(historicoChamada2.some((m: { texto: string }) => m.texto === 'Segunda pergunta')).toBe(false)
    expect(historicoChamada2.map((m: { texto: string }) => m.texto)).toEqual(['Primeira pergunta', 'Resposta 1'])
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
