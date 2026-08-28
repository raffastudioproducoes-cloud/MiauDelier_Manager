import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { DicaIA } from './DicaIA'
import * as geminiClient from './geminiClient'

describe('DicaIA', () => {
  it('mostra a resposta da IA quando a chamada tem sucesso', async () => {
    vi.spyOn(geminiClient, 'pedirDicaIA').mockResolvedValue('Use resina de baixa viscosidade para moldes fundos.')

    render(<ToastProvider><DicaIA /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: /pedir dica/i }))
    fireEvent.change(screen.getByLabelText(/sua pergunta/i), { target: { value: 'Qual resina usar em moldes fundos?' } })
    fireEvent.click(screen.getByRole('button', { name: /perguntar/i }))

    await waitFor(() => expect(screen.getByText(/baixa viscosidade/i)).toBeInTheDocument())
  })

  it('mostra toast de indisponibilidade sem quebrar a tela quando a IA está indisponível', async () => {
    vi.spyOn(geminiClient, 'pedirDicaIA').mockRejectedValue(new geminiClient.IaIndisponivelError('Sem conexão com a internet.'))

    render(<ToastProvider><DicaIA /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: /pedir dica/i }))
    fireEvent.change(screen.getByLabelText(/sua pergunta/i), { target: { value: 'pergunta qualquer' } })
    fireEvent.click(screen.getByRole('button', { name: /perguntar/i }))

    await waitFor(() => expect(screen.getByText(/sem conexão/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /pedir dica/i })).toBeInTheDocument()
  })
})
