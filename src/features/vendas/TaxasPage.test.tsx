import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { TaxasPage } from './TaxasPage'

async function renderPagina() {
  const utils = render(
    <ToastProvider>
      <TaxasPage />
    </ToastProvider>,
  )
  await screen.findByLabelText(/nome do canal ou plataforma/i)
  return utils
}

describe('TaxasPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('preenche automaticamente as taxas ao selecionar uma plataforma da lista de presets', async () => {
    await renderPagina()

    const select = screen.getByLabelText(/preenchimento automático por plataforma/i)
    fireEvent.change(select, { target: { value: 'shopee-frete-gratis' } })

    const inputNome = screen.getByLabelText(/nome do canal ou plataforma/i) as HTMLInputElement
    const inputPerc = screen.getByLabelText(/comissão percentual/i) as HTMLInputElement
    const inputFixo = screen.getByLabelText(/taxa fixa por venda/i) as HTMLInputElement

    expect(inputNome.value).toContain('Shopee')
    expect(inputPerc.value).toBe('20')
    expect(inputFixo.value).toBe('4')

    // O usuário pode editar livremente os valores
    fireEvent.change(inputPerc, { target: { value: '18' } })
    expect(inputPerc.value).toBe('18')

    fireEvent.click(screen.getByRole('button', { name: /cadastrar taxa/i }))

    await waitFor(() => expect(screen.getAllByText(/18\.00%/i).length).toBeGreaterThan(0))
  })

  it('reconhece a plataforma ao digitar o nome no campo', async () => {
    await renderPagina()

    const inputNome = screen.getByLabelText(/nome do canal ou plataforma/i)
    const inputPerc = screen.getByLabelText(/comissão percentual/i) as HTMLInputElement
    const inputFixo = screen.getByLabelText(/taxa fixa por venda/i) as HTMLInputElement

    fireEvent.change(inputNome, { target: { value: 'Mercado Livre' } })

    expect(inputPerc.value).toBe('11.5')
    expect(inputFixo.value).toBe('6')
  })
})
