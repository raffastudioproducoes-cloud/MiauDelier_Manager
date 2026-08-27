import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { PecasPage } from './PecasPage'

describe('PecasPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.15 })
  })

  it('cria uma peça vinculando forma e consumo de material', async () => {
    render(<ToastProvider><PecasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da peça/i), { target: { value: 'Chaveiro gato' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantidade consumida/i), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar peça/i }))

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
    expect(screen.getByRole('button', { name: /cadastrar peça/i })).toBeDisabled()
  })

  it('mostra mensagem de erro quando o consumo excede o estoque', async () => {
    render(<ToastProvider><PecasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da peça/i), { target: { value: 'Peça gigante' } })
    fireEvent.change(screen.getByLabelText(/^forma$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^material$/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/quantidade consumida/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar peça/i }))

    await waitFor(() => expect(screen.getByText(/estoque insuficiente/i)).toBeInTheDocument())
    expect(screen.queryByText('Peça gigante')).not.toBeInTheDocument()
  })
})
