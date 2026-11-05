import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import { criarPeca, atualizarStatusPeca } from './pecasRepo'
import { criarConta } from '../financeiro/contasRepo'
import { listarTransacoesDaConta } from '../financeiro/transacoesRepo'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

let pecaIdAtual = '1'

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ pecaId: pecaIdAtual }),
  }),
}))

const { PecaDetalhePage } = await import('./PecaDetalhePage')

describe('PecaDetalhePage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('mostra nome, forma, status, consumos e eventos da peça', async () => {
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [{ materialId, quantidade: 20 }] })
    pecaIdAtual = String(pecaId)

    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText('Chaveiro gato')).toBeInTheDocument())
    expect(screen.getByText(/forma: chaveiro/i)).toBeInTheDocument()
    expect(screen.getAllByText(/planejada/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/resina: 20/i)).toBeInTheDocument()
    expect(screen.getByText(/criacao/i)).toBeInTheDocument()
  })

  it('mostra estado vazio quando a peça não existe', async () => {
    pecaIdAtual = '999'
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/peça não encontrada/i)).toBeInTheDocument())
  })

  it('bloqueia reativação com estoque insuficiente e informa o total necessário', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    const pecaId = await criarPeca({ nome: 'Peça cancelada', formaId, consumos: [{ materialId, quantidade: 3 }, { materialId, quantidade: 3 }] })
    await atualizarStatusPeca(pecaId, 'cancelada')
    await db.materiais.update(materialId, { quantidadeEstoque: 5 })
    pecaIdAtual = String(pecaId)
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)
    expect(await screen.findByText(/necessário: 6 ml/i)).toHaveTextContent('Disponível: 5 ml')
    expect(screen.getByRole('option', { name: 'PLANEJADA' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'VENDIDA' })).toBeDisabled()
  })

  it('vender peça pede valor e cria transação', async () => {
    await setupAccount('senha-teste')
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const pecaId = await criarPeca({ nome: 'Chaveiro gato', formaId, consumos: [] })
    pecaIdAtual = String(pecaId)

    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText('Chaveiro gato')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'vendida' } })

    await waitFor(() => expect(screen.getByText('Confirmar venda')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Valor da venda'), { target: { value: '50' } })
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => expect(screen.getByText(/venda registrada com sucesso/i)).toBeInTheDocument())

    const transacoes = await listarTransacoesDaConta(contaId)
    expect(transacoes).toHaveLength(1)
    expect(transacoes[0].valor).toBe(50)
    expect(transacoes[0].tipo).toBe('entrada')
  })
})
