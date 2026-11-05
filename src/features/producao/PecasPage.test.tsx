import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import * as pecasRepo from './pecasRepo'
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

  it('inclui o EPI usado na cura no consumo e mantém o cadastro nas etapas seguintes', async () => {
    await criarMaterial({ nome: 'Luva', categoriaId: 1, unidade: 'un', quantidadeEstoque: 10, custoUnitario: 2, tipoClassificacao: 'epi' })
    const salvar = vi.spyOn(pecasRepo, 'criarPeca').mockResolvedValue(1)
    try {
      await renderPagina()
      fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Mesa' } })
      fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/^quantidade$/i), { target: { value: '20' } })
      fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
      expect(screen.queryByRole('button', { name: /fabricar nova peça/i })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /adicionar epi/i }))
      fireEvent.change(screen.getByLabelText(/^epi$/i), { target: { value: '2' } })
      fireEvent.change(screen.getByLabelText(/quantidade de epi/i), { target: { value: '2' } })
      expect(screen.getByLabelText(/unidade do epi/i)).toHaveValue('un')
      expect(screen.getByText(/estoque após consumo/i)).toHaveTextContent('8.000 un')
      fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
      fireEvent.click(screen.getByRole('button', { name: /fabricar nova peça/i }))
      await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.objectContaining({ consumos: expect.arrayContaining([
        expect.objectContaining({ materialId: 2, quantidade: 2, unidade: 'un' }),
      ]) })))
    } finally {
      salvar.mockRestore()
    }
  })

  it('soma o EPI ao consumo anterior para bloquear excesso de estoque', async () => {
    await renderPagina()
    fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^quantidade$/i), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
    fireEvent.click(screen.getByRole('button', { name: /adicionar epi/i }))
    fireEvent.change(screen.getByLabelText(/^epi$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantidade de epi/i), { target: { value: '300' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Necessário: 600 ml')
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled()
  })

  it('desabilita o cadastro e orienta a usuária quando não há forma nem material', async () => {
    await db.formas.clear()
    await db.materiais.clear()

    render(<ToastProvider><PecasPage /></ToastProvider>)

    await waitFor(() =>
      expect(screen.getByText(/cadastre pelo menos um material e uma forma/i)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: /fabricar nova peça/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled()
  })

  it('mostra mensagem de erro quando o consumo excede o estoque', async () => {
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/nome da peça/i), { target: { value: 'Peça gigante' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled()
  })

  it('bloqueia baixa enquanto estiver offline e libera ao reconectar', async () => {
    const conexao = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      await renderPagina()
      fireEvent.change(screen.getByLabelText('Material'), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '20' } })
      expect(screen.getByRole('alert')).toHaveTextContent(/conecte-se/i)
      fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: cura/i }))
    fireEvent.click(screen.getByRole('button', { name: /próxima etapa: desmolde/i }))
    expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeEnabled()
    await db.materiais.update(1, { quantidadeEstoque: 10 })
    await waitFor(() => expect(screen.getByRole('button', { name: /fabricar nova peça/i })).toBeDisabled())
    expect(screen.getByRole('alert')).toHaveTextContent('Disponível: 10 ml')
  })
})
