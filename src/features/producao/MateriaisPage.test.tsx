import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarCategoriaMaterial } from './categoriasMaterialRepo'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { MateriaisPage } from './MateriaisPage'

describe('MateriaisPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('mostra estado vazio quando não há materiais', async () => {
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    expect(await screen.findByText(/nenhum material cadastrado/i)).toBeInTheDocument()
  })

  it('cadastra um material e ele aparece na lista', async () => {
    await criarCategoriaMaterial('Resinas')
    render(<ToastProvider><MateriaisPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome do material/i), { target: { value: 'Resina Cristal' } })
    fireEvent.change(screen.getByLabelText(/unidade/i), { target: { value: 'ml' } })
    fireEvent.change(screen.getByLabelText(/quantidade em estoque/i), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText(/custo unitário/i), { target: { value: '0.15' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar material/i }))

    await waitFor(() => expect(screen.getByText('Resina Cristal')).toBeInTheDocument())
  })

  it('rejeita quantidade em estoque negativa antes de chamar o repositório', async () => {
    await criarCategoriaMaterial('Resinas')
    render(<ToastProvider><MateriaisPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome do material/i), { target: { value: 'Resina' } })
    fireEvent.change(screen.getByLabelText(/unidade/i), { target: { value: 'ml' } })
    fireEvent.change(screen.getByLabelText(/quantidade em estoque/i), { target: { value: '-5' } })
    fireEvent.change(screen.getByLabelText(/custo unitário/i), { target: { value: '0.1' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar material/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/estoque/i)
    const materiaisCriados = await db.materiais.toArray()
    expect(materiaisCriados).toHaveLength(0)
  })

  it('edita um material existente', async () => {
    await criarCategoriaMaterial('Resinas')
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome do material/i), { target: { value: 'Resina A' } })
    fireEvent.change(screen.getByLabelText(/unidade/i), { target: { value: 'ml' } })
    fireEvent.change(screen.getByLabelText(/quantidade em estoque/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/custo unitário/i), { target: { value: '0.1' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar material/i }))
    await waitFor(() => screen.getByText('Resina A'))

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/nome do material/i), { target: { value: 'Resina A Editada' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(screen.getByText('Resina A Editada')).toBeInTheDocument())
  })

  it('repõe estoque de um material', async () => {
    await criarCategoriaMaterial('Resinas')
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome do material/i), { target: { value: 'Resina B' } })
    fireEvent.change(screen.getByLabelText(/unidade/i), { target: { value: 'ml' } })
    fireEvent.change(screen.getByLabelText(/quantidade em estoque/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/custo unitário/i), { target: { value: '0.1' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar material/i }))
    await waitFor(() => screen.getByText('Resina B'))

    fireEvent.click(screen.getByRole('button', { name: /repor estoque/i }))
    fireEvent.change(screen.getByLabelText(/quantidade a adicionar/i), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    await waitFor(() => expect(screen.getByText(/150/)).toBeInTheDocument())
  })

  it('exclui um material via confirmação', async () => {
    await criarCategoriaMaterial('Resinas')
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome do material/i), { target: { value: 'Resina C' } })
    fireEvent.change(screen.getByLabelText(/unidade/i), { target: { value: 'ml' } })
    fireEvent.change(screen.getByLabelText(/quantidade em estoque/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/custo unitário/i), { target: { value: '0.1' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar material/i }))
    await waitFor(() => screen.getByText('Resina C'))

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.queryByText('Resina C')).not.toBeInTheDocument())
  })
})
