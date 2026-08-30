import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import { criarPeca } from './pecasRepo'
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
    expect(screen.getByText(/planejada/i)).toBeInTheDocument()
    expect(screen.getByText(/resina: 20/i)).toBeInTheDocument()
    expect(screen.getByText(/criacao/i)).toBeInTheDocument()
  })

  it('mostra estado vazio quando a peça não existe', async () => {
    pecaIdAtual = '999'
    render(<ToastProvider><PecaDetalhePage /></ToastProvider>)

    await waitFor(() => expect(screen.getByText(/peça não encontrada/i)).toBeInTheDocument())
  })
})
