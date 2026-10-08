import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/ToastProvider'

const obterEstadoGemini = vi.fn()
const removerChaveGemini = vi.fn()
const configurarChaveGemini = vi.fn()

vi.mock('./iaConfigRepo', () => ({
  definirPersonalidade: vi.fn(),
  obterPersonalidade: vi.fn().mockResolvedValue('tecnica'),
}))
vi.mock('./geminiClient', () => ({
  configurarChaveGemini,
  obterEstadoGemini,
  removerChaveGemini,
}))

const { ConfiguracoesPage } = await import('./ConfiguracoesPage')

describe('ConfiguracoesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bloqueia troca de chave cadastrada e permite removê-la antes de salvar outra', async () => {
    obterEstadoGemini.mockResolvedValue({ status: 'connected', message: 'Conectado: chave cadastrada e conexão verificada.' })
    removerChaveGemini.mockResolvedValue(undefined)

    render(<ToastProvider><ConfiguracoesPage /></ToastProvider>)

    const campo = await screen.findByLabelText(/chave da api gemini/i)
    expect(campo).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(/conectado/i)

    fireEvent.click(screen.getByRole('button', { name: /remover chave/i }))
    await waitFor(() => expect(removerChaveGemini).toHaveBeenCalledOnce())
    expect(campo).toBeEnabled()
    expect(screen.getByRole('button', { name: /salvar chave gemini/i })).toBeEnabled()
    expect(configurarChaveGemini).not.toHaveBeenCalled()
  })
})
