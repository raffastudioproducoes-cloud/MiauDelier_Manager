import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { criarCategoriaMaterial, listarCategoriasMaterial } from './categoriasMaterialRepo'
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

  it('cadastra um novo material pela aba de compras e ele aparece na lista', async () => {
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    
    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))
    
    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Resina Cristal' } })
    fireEvent.change(screen.getByLabelText(/unidade de medida/i), { target: { value: 'ml' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '150' } })
    fireEvent.change(screen.getByLabelText(/divisão/i), { target: { value: 'consumivel' } })
    
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))

    await waitFor(() => expect(screen.getByText('Resina Cristal')).toBeInTheDocument())
  })

  it('rejeita quantidade em estoque negativa antes de chamar o repositório', async () => {
    render(<ToastProvider><MateriaisPage /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))

    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Resina' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '-5' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '10' } })
    
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/quantidade/i)
    const materiaisCriados = await db.materiais.toArray()
    expect(materiaisCriados).toHaveLength(0)
  })

  it('repõe estoque de um material', async () => {
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    
    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))
    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Resina B' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))
    await waitFor(() => screen.getByText('Resina B'))

    fireEvent.click(screen.getByRole('button', { name: /repor estoque/i }))
    
    fireEvent.change(await screen.findByLabelText(/quantidade comprada/i), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))

    await waitFor(() => expect(screen.getByText(/150 ml em estoque/i)).toBeInTheDocument())
  })

  it('cria um material em uma divisão customizada', async () => {
    await criarCategoriaMaterial('Ferramentas Especiais')
    const categorias = await listarCategoriasMaterial()
    const divCustom = categorias.find(c => c.nome === 'Ferramentas Especiais')

    render(<ToastProvider><MateriaisPage /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))

    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Cola Quente' } })
    fireEvent.change(screen.getByLabelText(/unidade de medida/i), { target: { value: 'un' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/divisão/i), { target: { value: `cat_${divCustom?.id}` } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))

    await waitFor(() => expect(screen.getByText('Cola Quente')).toBeInTheDocument())
    expect(screen.getByText(/em estoque/)).toBeInTheDocument()
  })

  it('exclui um material via confirmação', async () => {
    render(<ToastProvider><MateriaisPage /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))
    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Resina C' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))
    await waitFor(() => screen.getByText('Resina C'))

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.queryByText('Resina C')).not.toBeInTheDocument())
  })

  it('permite cadastrar material sólido em gramas e material com unidade personalizada', async () => {
    render(<ToastProvider><MateriaisPage /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))

    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Pigmento Mica Azul' } })
    fireEvent.change(screen.getByLabelText(/unidade de medida/i), { target: { value: 'g' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))

    await waitFor(() => expect(screen.getByText('Pigmento Mica Azul')).toBeInTheDocument())
    expect(screen.getByText(/50 g em estoque/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Registrar Nova Compra/i }))
    fireEvent.click(await screen.findByLabelText(/\+ Cadastrar e comprar novo material/i))

    fireEvent.change(screen.getByLabelText(/nome do produto/i), { target: { value: 'Glitter Dourado' } })
    fireEvent.change(screen.getByLabelText(/unidade de medida/i), { target: { value: '__outra__' } })
    fireEvent.change(await screen.findByLabelText(/especificar unidade/i), { target: { value: 'bisnaga' } })
    fireEvent.change(screen.getByLabelText(/quantidade comprada/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/valor dos produtos/i), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar compra/i }))

    await waitFor(() => expect(screen.getByText('Glitter Dourado')).toBeInTheDocument())
    expect(screen.getByText(/10 bisnaga em estoque/i)).toBeInTheDocument()
  })
})


