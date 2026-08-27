import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function BotaoDeTeste() {
  const { mostrarToast } = useToast()
  return <button onClick={() => mostrarToast('Salvo com sucesso')}>Salvar</button>
}

describe('ToastProvider / useToast', () => {
  it('mostra o toast na tela ao chamar mostrarToast', async () => {
    render(
      <ToastProvider>
        <BotaoDeTeste />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('Salvar'))
    expect(await screen.findByText('Salvo com sucesso')).toBeInTheDocument()
  })

  it('lança erro quando useToast é usado fora de um ToastProvider', () => {
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<BotaoDeTeste />)).toThrow('useToast precisa estar dentro de um ToastProvider')
    consoleErro.mockRestore()
  })
})
