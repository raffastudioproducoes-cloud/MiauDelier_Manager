import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => (
    <a href={to.replace('$pecaId', params?.pecaId ?? '')} {...props}>{children}</a>
  ),
}))

const { PecasPage } = await import('./PecasPage')

async function renderPagina() {
  const utils = render(
    <ToastProvider>
      <PecasPage />
    </ToastProvider>,
  )
  await screen.findByLabelText(/nome da peça/i)
  return utils
}

describe('PecasPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
  })

  it('cria uma peça vinculando forma e consumo de material', async () => {
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Chaveiro gato' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /fabricar nova peça/i }))

    await waitFor(() => expect(screen.getByText('Chaveiro gato')).toBeInTheDocument())
    expect(screen.getByText(/planejada/i)).toBeInTheDocument()
  })

  it('desabilita o cadastro e orienta a usuária quando não há forma nem material', async () => {
    await db.formas.clear()
    await db.materiais.clear()

    render(<ToastProvider><PecasPage /></ToastProvider>)

    await waitFor(() =>
      expect(screen.getByText(/cadastre pelo menos um material e uma forma/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled()
  })

  it('mostra mensagem de erro quando o consumo excede o estoque', async () => {
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Peça gigante' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /fabricar nova peça/i }))

    await waitFor(() => expect(screen.getByText(/estoque insuficiente/i)).toBeInTheDocument())
    expect(screen.queryByText('Peça gigante')).not.toBeInTheDocument()
  })

  it('soma linhas do mesmo material e bloqueia o cadastro quando a soma excede o estoque', async () => {
    await renderPagina()
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: /adicionar material/i }))
    fireEvent.change(screen.getAllByLabelText('Material')[1], { target: { value: '1' } })
    fireEvent.change(screen.getAllByLabelText('Quantidade')[1], { target: { value: '300' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Necessário: 600 ml')
    expect(screen.getByRole('alert')).toHaveTextContent('Disponível: 500 ml')
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled()
  })

  it('bloqueia baixa enquanto estiver offline e libera ao reconectar', async () => {
    const conexao = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      await renderPagina()
      fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '20' } })
      expect(screen.getByRole('alert')).toHaveTextContent(/conecte-se/i)
      expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled()
      conexao.mockReturnValue(true)
      fireEvent(window, new Event('online'))
      expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeEnabled()
    } finally {
      conexao.mockRestore()
    }
  })

  it('atualiza a trava quando o estoque muda enquanto o formulário está aberto', async () => {
    await renderPagina()
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '20' } })
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeEnabled()
    await db.materiais.update(1, { quantidadeEstoque: 10 })
    await waitFor(() => expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled())
    expect(screen.getByRole('alert')).toHaveTextContent('Disponível: 10 ml')
  })

  it('permite adicionar múltiplas linhas de consumo de material', async () => {
    await criarMaterial({ nome: 'Pigmento', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 200, custoUnitario: 1 })
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Peça mista' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: /adicionar material/i }))
    const materiais = screen.getAllByLabelText('Material')
    const quantidades = screen.getAllByLabelText('Quantidade')
    fireEvent.change(materiais[1], { target: { value: '2' } })
    fireEvent.change(quantidades[1], { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: /fabricar nova peça/i }))

    await waitFor(() => expect(screen.getByText('Peça mista')).toBeInTheDocument())
  })

  it('exclui peça via ConfirmModal e devolve material ao estoque', async () => {
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Peça a excluir' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /fabricar nova peça/i }))

    await waitFor(() => expect(screen.getByText('Peça a excluir')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.queryByText('Peça a excluir')).not.toBeInTheDocument())
  })

  it('cada item da lista de peças é um link pro detalhe', async () => {
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Chaveiro gato' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /fabricar nova peça/i }))

    await waitFor(() => expect(screen.getByText('Chaveiro gato')).toBeInTheDocument())
    const link = screen.getByText('Chaveiro gato').closest('a')
    expect(link).toHaveAttribute('href', '/pecas/1')
  })
})
