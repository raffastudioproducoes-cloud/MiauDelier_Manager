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
    fireEvent.change(await screen.findByLabelText(/^comprimento \(cm\)$/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/^largura \(cm\)$/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/profundidade/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/comprimento interno da caixa/i), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/largura interna da caixa/i), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText(/altura interna da caixa/i), { target: { value: '4' } })
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

  it('persiste e restaura medidas e densidade do cálculo de silicone ao editar o molde', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Mesa com molde calculado' } })
    fireEvent.change(screen.getByLabelText(/^geometria$/i), { target: { value: 'retangular' } })
    fireEvent.change(await screen.findByLabelText(/^comprimento \(cm\)$/i), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText(/^largura \(cm\)$/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/profundidade \/ espessura/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /adicionar furo/i }))
    fireEvent.change(screen.getByLabelText(/profundidade \(cm - opcional\)/i), { target: { value: '1' } })
    expect(screen.getByText(/Tampo maciço:/i)).toHaveTextContent('Vazios: 796.4 ml')
    fireEvent.change(await screen.findByLabelText(/comprimento interno da caixa/i), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(/largura interna da caixa/i), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText(/altura interna da caixa/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/densidade do silicone/i), { target: { value: '1,2' } })
    expect(screen.getByText((_, el) => el?.tagName.toLowerCase() === 'p' && /Silicone com 8% de margem/i.test(el.textContent ?? ''))).toHaveTextContent('21,92 L · 26,30 kg')
    fireEvent.change(screen.getByLabelText(/vida útil/i), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))

    await waitFor(() => expect(screen.getByText('Mesa com molde calculado')).toBeInTheDocument())
    let forma = (await listarFormas()).find((item) => item.nome === 'Mesa com molde calculado')
    expect(forma?.dimensoesCaixaSiliconeCm).toEqual({ comprimento: 60, largura: 40, altura: 10 })
    expect(forma?.densidadeSiliconeGcm3).toBe(1.2)
    expect(forma?.vidaUtilUsos).toBe(80)

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText(/comprimento interno da caixa/i)).toHaveValue('60')
    expect(screen.getByLabelText(/densidade do silicone/i)).toHaveValue('1.2')
    fireEvent.change(screen.getByLabelText(/densidade do silicone/i), { target: { value: '1,3' } })
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))

    await waitFor(async () => {
      forma = (await listarFormas()).find((item) => item.nome === 'Mesa com molde calculado')
      expect(forma?.densidadeSiliconeGcm3).toBe(1.3)
      expect(forma?.vidaUtilUsos).toBe(80)
    })
  })

  it('debita a quantidade calculada e ajusta o estoque pela diferença ao editar', async () => {
    const id = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'g', quantidadeEstoque: 10000, custoUnitario: 0.01 })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Molde com estoque' } })
    fireEvent.change(screen.getByLabelText(/^geometria$/i), { target: { value: 'retangular' } })
    fireEvent.change(screen.getByLabelText(/^comprimento \(cm\)$/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/^largura \(cm\)$/i), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText(/profundidade \/ espessura/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/comprimento interno da caixa/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/largura interna da caixa/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/altura interna da caixa/i), { target: { value: '10' } })
    fireEvent.change(await screen.findByLabelText(/silicone utilizado do estoque/i), { target: { value: String(id) } })
    await waitFor(() => expect(screen.getByText(/quantidade calculada para o estoque/i)).toHaveTextContent('3.436,4 g'))
    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))
    await screen.findByText('Molde com estoque')
    expect((await db.materiais.get(id))?.quantidadeEstoque).toBeCloseTo(6563.6)
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/margem do silicone/i), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/quantidade de silicone realmente usada/i), { target: { value: '3498.88' } })
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument())
    expect((await db.materiais.get(id))?.quantidadeEstoque).toBeCloseTo(6501.12)
  })

  it('registra o silicone de uma forma antiga sem consumo ao salvar sua edição', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const formaId = await db.formas.add({ nome: 'Mesa antiga', geometria: 'retangular', dimensoesCm: { comprimento: 10, largura: 8, profundidade: 2 }, volumeDiretoMl: 160, vidaUtilUsos: 100, custoCaixaEstrutura: 25, custoFabricacao: 25, dimensoesCaixaSiliconeCm: { comprimento: 20, largura: 15, altura: 10 }, densidadeSiliconeGcm3: 1.1 })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    await screen.findByText('Mesa antiga')
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/silicone utilizado do estoque/i), { target: { value: String(materialId) } })
    expect(screen.getByText(/quantidade calculada para o estoque/i)).toHaveTextContent('3,436 kg')
    fireEvent.change(screen.getByLabelText(/quantidade de silicone realmente usada/i), { target: { value: '2' } })
    await waitFor(() => expect(screen.getByText(/custo do silicone utilizado/i)).toHaveTextContent('R$ 200.00'))
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(async () => expect((await db.formas.get(formaId))?.quantidadeSiliconeUsada).toBe(2))
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect((await db.formas.get(formaId))?.custoFabricacao).toBe(225)
  })

  it('permite regularizar uma forma antiga com quantidade salva sem desconto e impede desconto duplicado', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const formaId = await db.formas.add({ nome: 'Mesa pendente', geometria: 'retangular', dimensoesCm: { comprimento: 10, largura: 8, profundidade: 2 }, volumeDiretoMl: 160, vidaUtilUsos: 100, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, dimensoesCaixaSiliconeCm: { comprimento: 20, largura: 15, altura: 10 }, densidadeSiliconeGcm3: 1.1 })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    await screen.findByText('Mesa pendente')
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /ainda não foi descontada/i }))
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(async () => expect((await db.formas.get(formaId))?.baixaSiliconeConfirmada).toBe(true))
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect((await db.formas.get(formaId))?.custoFabricacao).toBe(200)
    await waitFor(() => expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.queryByRole('checkbox', { name: /ainda não foi descontada/i })).not.toBeInTheDocument()
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

  it('cadastra uma forma com material e custo da caixa de contenção / estrutura', async () => {
    render(<ToastProvider><FormasPage /></ToastProvider>)

    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Molde Mesa Pet' } })
    fireEvent.change(screen.getByLabelText(/^geometria$/i), { target: { value: 'retangular' } })
    fireEvent.change(await screen.findByLabelText(/^comprimento \(cm\)$/i), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText(/^largura \(cm\)$/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/profundidade/i), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/comprimento interno da caixa/i), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText(/largura interna da caixa/i), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText(/altura interna da caixa/i), { target: { value: '10' } })

    fireEvent.change(screen.getByLabelText(/material da caixa\/estrutura/i), { target: { value: 'MDF 15mm' } })
    fireEvent.change(screen.getByLabelText(/custo da caixa\/estrutura/i), { target: { value: '25.00' } })

    fireEvent.click(screen.getByRole('button', { name: /cadastrar forma/i }))

    await waitFor(() => expect(screen.getByText('Molde Mesa Pet')).toBeInTheDocument())

    const formas = await listarFormas()
    const forma = formas.find((f) => f.nome === 'Molde Mesa Pet')
    expect(forma?.materialCaixaEstrutura).toBe('MDF 15mm')
    expect(forma?.custoCaixaEstrutura).toBe(25)
    expect(forma?.custoFabricacao).toBe(25)
  })
})
