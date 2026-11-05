import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarPeca } from './pecasRepo'
import { criarMaterial } from './materiaisRepo'
import { criarConta } from '../financeiro/contasRepo'
import { listarTransacoesDaConta } from '../financeiro/transacoesRepo'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'

vi.mock('./estoqueServidor', () => ({ transacaoComEstoque: <T,>(fn: () => Promise<T>) => fn() }))

let pecaIdAtual = '1'

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useParams: () => ({ pecaId: pecaIdAtual }),
  }),
}))

const { PecaDetalhePage } = await import('./PecaDetalhePage')

describe('PecaDetalhePage', () => {
  beforeEach(async () => {
    window.history.replaceState({}, '', '/')
    await db.delete()
    await db.open()
  })

  it('abre a edição pelo link de detalhes e ajusta estoque ao salvar materiais', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const id = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 2 }] })
    pecaIdAtual = String(id)
    window.history.replaceState({}, '', '/#editar')
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)
    await screen.findByRole('dialog')
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(async () => expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(7))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await db.pecas.get(id))?.precoVenda).toBe(450)
  })

  it('mostra estado vazio quando a peça não existe', async () => {
    pecaIdAtual = '999'
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/peça não encontrada/i)).toBeInTheDocument())
  })

  it('não quebra a tela se uma peça antiga possuir taxa inválida', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [] })
    await db.pecas.update(id, { percentualTaxas: 100 })
    pecaIdAtual = String(id)
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível calcular o preço/i)
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
