import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { FormasPage } from './FormasPage'
import { listarFormas } from './formasRepo'

describe('FormasPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('calcula o volume ao preencher as dimensões de uma forma cilíndrica', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/^raio/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/^altura/i), { target: { value: '2' } })

    await waitFor(() => expect(screen.getByText(/volume calculado/i).closest('p')?.textContent).toMatch(/157/))
  })

  it('cadastra uma forma e ela aparece na lista', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Porta-copo' } })
    fireEvent.change(screen.getByLabelText(/^raio/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/^altura/i), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))

    await waitFor(() => expect(screen.getByText('Porta-copo')).toBeInTheDocument())
  })

  it('cadastra uma forma retangular', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Sabonete retangular' } })
    fireEvent.change(screen.getByLabelText(/^geometria$/i), { target: { value: 'retangular' } })
    fireEvent.change(await screen.findByLabelText(/comprimento/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/largura/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/profundidade/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))

    await waitFor(() => expect(screen.getByText('Sabonete retangular')).toBeInTheDocument())
    const linhaRetangular = screen.getByText(
      (_, el) => el?.tagName.toLowerCase() === 'p' && /Retangular/.test(el.textContent ?? '') && /100\.0 ml/.test(el.textContent ?? ''),
    )
    expect(linhaRetangular).toBeInTheDocument()

    const formas = await listarFormas()
    const forma = formas.find((f) => f.nome === 'Sabonete retangular')
    expect(forma?.volumeDiretoMl).toBeCloseTo(10 * 5 * 2)
    expect(forma?.dimensoesCm).toEqual({ comprimento: 10, largura: 5, profundidade: 2 })
  })

  it('cadastra uma forma esférica', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Bolinha' } })
    fireEvent.change(screen.getByLabelText(/^geometria$/i), { target: { value: 'esferico' } })
    fireEvent.change(await screen.findByLabelText(/^raio/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))

    await waitFor(() => expect(screen.getByText('Bolinha')).toBeInTheDocument())

    const volumeEsperado = (4 / 3) * Math.PI * Math.pow(3, 3)
    const volumeTexto = `${volumeEsperado.toFixed(1)} ml`.replace('.', '\\.')
    const linhaEsferica = screen.getByText(
      (_, el) => el?.tagName.toLowerCase() === 'p' && /Esférico/.test(el.textContent ?? '') && new RegExp(volumeTexto).test(el.textContent ?? ''),
    )
    expect(linhaEsferica).toBeInTheDocument()

    const formas = await listarFormas()
    const forma = formas.find((f) => f.nome === 'Bolinha')
    expect(forma?.volumeDiretoMl).toBeCloseTo(volumeEsperado)
    expect(forma?.dimensoesCm).toEqual({ raio: 3 })
  })

  it('edita uma forma existente', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Molde A' } })
    fireEvent.change(screen.getByLabelText(/^raio/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/^altura/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))
    await waitFor(() => screen.getByText('Molde A'))

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/nome da forma/i), { target: { value: 'Molde A Editado' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(screen.getByText('Molde A Editado')).toBeInTheDocument())
  })

  it('exclui uma forma via confirmação', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Molde B' } })
    fireEvent.change(screen.getByLabelText(/^raio/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/^altura/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))
    await waitFor(() => screen.getByText('Molde B'))

    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(screen.queryByText('Molde B')).not.toBeInTheDocument())
  })
})
