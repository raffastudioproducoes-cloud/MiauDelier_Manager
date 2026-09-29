import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarForma } from '../producao/formasRepo'
import { criarMaterial } from '../producao/materiaisRepo'
import { criarPeca } from '../producao/pecasRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { PrecificacaoPage } from './PrecificacaoPage'

async function renderPagina() {
  const utils = render(
    <ToastProvider>
      <PrecificacaoPage />
    </ToastProvider>,
  )
  await screen.findByLabelText(/peça \(opcional\)/i)
  return utils
}

describe('PrecificacaoPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('calcula o preço final ao adicionar embalagem do estoque, horas e margem', async () => {
    const caixaId = await criarMaterial({
      nome: 'Caixa de Envio P',
      categoriaId: 1,
      unidade: 'un',
      quantidadeEstoque: 50,
      custoUnitario: 5.0,
      tipoClassificacao: 'administrativo',
    })

    await renderPagina()

    fireEvent.change(await screen.findByLabelText(/caixa \/ embalagem /i), { target: { value: String(caixaId) } })
    fireEvent.click(screen.getByRole('button', { name: /\+ adicionar ao custo/i }))

    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/rateio de custo fixo/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/margem de lucro/i), { target: { value: '40' } })

    await waitFor(() => expect(screen.getAllByText(/56,35|56\.35/).length).toBeGreaterThan(0))
  })

  it('não quebra a tela com entrada inválida (percentual fora de faixa)', async () => {
    await renderPagina()

    fireEvent.change(screen.getByLabelText(/margem de lucro/i), { target: { value: '99999' } })

    expect(await screen.findByText(/preço final: —/i)).toBeInTheDocument()
  })

  it('mostra aviso quando nada foi preenchido', async () => {
    await renderPagina()

    expect(await screen.findByText(/preencha os campos/i)).toBeInTheDocument()
  })

  it('mostra a decomposição completa do cálculo com peça selecionada', async () => {
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [{ materialId, quantidade: 100 }] })

    await renderPagina()

    fireEvent.change(await screen.findByLabelText(/peça \(opcional\)/i), { target: { value: String(pecaId) } })

    await waitFor(() => expect(screen.getAllByText(/R\$\s*15,00/).length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })

    await waitFor(() => {
      expect(screen.getAllByText(/custo direto/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/mão de obra/i).length).toBeGreaterThan(0)
    })
  })

  it('carrega custos de resina automaticamente da produção ao selecionar uma peça e permite salvar o preço', async () => {
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [{ materialId, quantidade: 100 }] })

    await renderPagina()

    fireEvent.change(await screen.findByLabelText(/peça \(opcional\)/i), { target: { value: String(pecaId) } })

    await waitFor(() => expect(screen.getByText(/✓ peça vinculada/i)).toBeInTheDocument(), { timeout: 5000 })
    await waitFor(() => expect(screen.getAllByText(/R\$\s*15,00/).length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText(/horas de produção/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/valor da hora/i), { target: { value: '20' } })

    const botaoSalvar = await screen.findByRole('button', { name: /salvar .* como preço de venda/i })
    fireEvent.click(botaoSalvar)

    await waitFor(async () => {
      const peca = await db.pecas.get(pecaId)
      expect(peca?.precoVenda).toBeCloseTo(35)
    })
  })

  it('permite buscar e atualizar concessionárias de luz e água diretamente na precificação', async () => {
    await renderPagina()

    // Aguarda o carregamento inicial da concessionária Padrão (Enel SP)
    await waitFor(() => expect(screen.getAllByText(/Enel/i).length).toBeGreaterThan(0))

    const estadoInput = screen.getByLabelText(/estado \(uf\)/i)
    fireEvent.change(estadoInput, { target: { value: 'RJ' } })

    // Wait for React to re-render with the new state
    const botaoBuscar = await screen.findByRole('button', { name: /buscar tarifas.*\(RJ\)/i })
    fireEvent.click(botaoBuscar)

    const elements = await screen.findAllByText(/Light/i, {}, { timeout: 4000 })
    expect(elements[0]).toBeInTheDocument()
    
    expect((await screen.findAllByText(/Águas do Rio/i))[0]).toBeInTheDocument()
  })

  it('calcula o valor da hora de mão de obra a partir do valor por dia e jornada diária', async () => {
    await renderPagina()

    const inputDia = screen.getByLabelText(/mão de obra por dia/i)
    const inputJornada = screen.getByLabelText(/jornada diária/i)
    const inputHora = screen.getByLabelText(/valor da hora \(r\$\)/i) as HTMLInputElement

    fireEvent.change(inputDia, { target: { value: '320' } })
    fireEvent.change(inputJornada, { target: { value: '8' } })

    expect(inputHora.value).toBe('40.00')
  })
})



