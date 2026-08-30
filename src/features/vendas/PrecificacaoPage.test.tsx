import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarForma } from '../producao/formasRepo'
import { criarMaterial } from '../producao/materiaisRepo'
import { criarPeca } from '../producao/pecasRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { PrecificacaoPage } from './PrecificacaoPage'

function renderPagina() {
  return render(
    <ToastProvider>
      <PrecificacaoPage />
    </ToastProvider>,
  )
}

describe('PrecificacaoPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('calcula o preço final ao preencher os campos', async () => {
    renderPagina()

    fireEvent.change(screen.getByLabelText(/custo do material/i), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText(/acessórios/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/rateio de custo fixo/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/margem de lucro/i), { target: { value: '40' } })

    await waitFor(() => expect(screen.getByText(/96,60|96\.60/)).toBeInTheDocument())
  })

  it('não quebra a tela com entrada inválida (percentual fora de faixa)', async () => {
    renderPagina()

    fireEvent.change(screen.getByLabelText(/margem de lucro/i), { target: { value: '99999' } })

    expect(await screen.findByText(/preço final: —/i)).toBeInTheDocument()
  })

  it('mostra aviso em vez de R$ 0,00 quando nada foi preenchido', () => {
    renderPagina()

    expect(screen.getByText(/preencha os campos/i)).toBeInTheDocument()
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument()
  })

  it('mostra a decomposição completa do cálculo', async () => {
    renderPagina()

    fireEvent.change(screen.getByLabelText(/custo do material/i), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })

    await waitFor(() => {
      expect(screen.getByText(/custo direto/i)).toBeInTheDocument()
      expect(screen.getByText(/mão de obra/i)).toBeInTheDocument()
    })
  })

  it('pré-preenche custo do material ao selecionar uma peça e permite salvar o preço', async () => {
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [{ materialId, quantidade: 100 }] })

    renderPagina()

    fireEvent.change(await screen.findByLabelText(/peça \(opcional\)/i), { target: { value: String(pecaId) } })

    await waitFor(() => expect(screen.getByLabelText(/custo do material/i)).toHaveValue(15), { timeout: 5000 })

    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })

    const botaoSalvar = await screen.findByRole('button', { name: /salvar como preço de venda/i })
    fireEvent.click(botaoSalvar)

    await waitFor(async () => {
      const peca = await db.pecas.get(pecaId)
      expect(peca?.precoVenda).toBeCloseTo(35)
    })
  })
})
