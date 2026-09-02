import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { definirChaveGemini } from './iaConfigRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { ConfiguracoesPage } from './ConfiguracoesPage'

describe('ConfiguracoesPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('mostra campo para configurar a chave quando ainda não há uma', async () => {
    render(<ToastProvider><ConfiguracoesPage /></ToastProvider>)
    expect(await screen.findByLabelText(/chave de api do gemini/i)).toBeInTheDocument()
  })

  it('configura a chave e passa a mostrar que já está configurada, sem exibir o valor', async () => {
    render(<ToastProvider><ConfiguracoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/chave de api do gemini/i), { target: { value: 'AIzaSy-minha-chave' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar chave/i }))

    await waitFor(() => expect(screen.getByText(/chave configurada/i)).toBeInTheDocument())
    expect(screen.queryByText('AIzaSy-minha-chave')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/chave de api do gemini/i)).not.toBeInTheDocument()
  })

  it('quando a chave já está configurada, não mostra o campo de novo ao carregar', async () => {
    await definirChaveGemini('chave-ja-configurada')
    render(<ToastProvider><ConfiguracoesPage /></ToastProvider>)

    expect(await screen.findByText(/chave configurada/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/chave de api do gemini/i)).not.toBeInTheDocument()
  })

  it('permite editar a chave já configurada', async () => {
    await definirChaveGemini('chave-antiga')
    render(<ToastProvider><ConfiguracoesPage /></ToastProvider>)

    fireEvent.click(await screen.findByRole('button', { name: /editar/i }))
    fireEvent.change(await screen.findByLabelText(/chave de api do gemini/i), { target: { value: 'chave-atualizada' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar chave/i }))

    await waitFor(async () => {
      const { obterChaveGemini } = await import('./iaConfigRepo')
      expect(await obterChaveGemini()).toBe('chave-atualizada')
    })
    expect(screen.queryByLabelText(/chave de api do gemini/i)).not.toBeInTheDocument()
  })

  it('permite escolher a personalidade do assistente', async () => {
    render(<ToastProvider><ConfiguracoesPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/personalidade do assistente/i), { target: { value: 'acolhedora' } })

    await waitFor(async () => {
      const { obterPersonalidade } = await import('./iaConfigRepo')
      expect(await obterPersonalidade()).toBe('acolhedora')
    })
  })
})
