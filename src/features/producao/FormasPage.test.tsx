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
      (_, el) => el?.tagName.toLowerCase() === 'p' && /Retangular/.test(el.textContent ?? '') && /10 × 5 × 2 cm/.test(el.textContent ?? ''),
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

  it('preserva dados históricos de resina e pés ao editar um molde', async () => {
    const id = await db.formas.add({ nome: 'Histórico', geometria: 'retangular', dimensoesCm: { comprimento: 10, largura: 8, profundidade: 2 }, volumeDiretoMl: 180, litrosResina: 0.18, massaResinaKg: 0.198, margemSegurancaPercentual: 12, pesMesa: { quantidade: 4, geometria: 'cilindrico', raioCm: 1, alturaCm: 3 }, dimensoesCaixaSiliconeCm: { comprimento: 20, largura: 15, altura: 10 }, densidadeSiliconeGcm3: 1.1, vidaUtilUsos: 90, usosRealizados: 7, status: 'pronta' })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    await screen.findByText('Histórico')
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/nome da forma/i), { target: { value: 'Histórico editado' } })
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await screen.findByText('Histórico editado')
    expect(await db.formas.get(id)).toMatchObject({ volumeDiretoMl: 180, litrosResina: 0.18, massaResinaKg: 0.198, margemSegurancaPercentual: 12, pesMesa: { quantidade: 4, geometria: 'cilindrico', raioCm: 1, alturaCm: 3 }, vidaUtilUsos: 90, usosRealizados: 7, status: 'pronta' })
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
    expect(screen.getByText(/capacidade interna da caixa:/i)).toHaveTextContent('24,000 L')
    expect(screen.getByText(/volume ocupado pela madeira:/i)).toHaveTextContent('3,704 L')
    expect(screen.getByText(/massa de silicone sem margem:/i)).toHaveTextContent('24,36 kg')
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

  it('bloqueia quantidade em kg acima do estoque em gramas e remove cálculos de resina da tela', async () => {
    const id = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'g', quantidadeEstoque: 10000, custoUnitario: 0.01 })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    fireEvent.change(await screen.findByLabelText(/nome da forma/i), { target: { value: 'Molde' } })
    fireEvent.change(screen.getByLabelText(/^geometria$/i), { target: { value: 'retangular' } })
    fireEvent.change(screen.getByLabelText(/^comprimento \(cm\)$/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/^largura \(cm\)$/i), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText(/profundidade \/ espessura/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/comprimento interno da caixa/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/largura interna da caixa/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/altura interna da caixa/i), { target: { value: '10' } })
    await screen.findByRole('option', { name: /^silicone \(/i })
    fireEvent.change(screen.getByLabelText(/silicone utilizado do estoque/i), { target: { value: String(id) } })
    fireEvent.change(screen.getByLabelText(/quantidade de silicone realmente usada \(kg\)/i), { target: { value: '11' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Necessário: 11 kg')
    expect(screen.getByRole('alert')).toHaveTextContent('Disponível: 10 kg')
    expect(screen.getByRole('button', { name: /cadastrar forma/i })).toBeDisabled()
    expect(screen.queryByText(/cálculo técnico de resina/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/margem de segurança da resina/i)).not.toBeInTheDocument()
  })

  it('ao editar, verifica somente o acréscimo de silicone em relação ao já debitado', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'g', quantidadeEstoque: 1000, custoUnitario: 0.1 })
    await db.formas.add({ nome: 'Molde editável', geometria: 'retangular', dimensoesCm: { comprimento: 10, largura: 8, profundidade: 2 }, volumeDiretoMl: 160, vidaUtilUsos: 100, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2000, custoSiliconeFabricacao: 200, baixaSiliconeConfirmada: true, dimensoesCaixaSiliconeCm: { comprimento: 20, largura: 15, altura: 10 }, densidadeSiliconeGcm3: 1.1 })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    await screen.findByText('Molde editável')
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(screen.getByLabelText(/quantidade de silicone realmente usada \(kg\)/i)).toHaveValue(2)
    fireEvent.change(screen.getByLabelText(/quantidade de silicone realmente usada/i), { target: { value: '3' } })
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled()
    fireEvent.change(screen.getByLabelText(/quantidade de silicone realmente usada/i), { target: { value: '4' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Necessário: 2 kg')
    expect(screen.getByRole('alert')).toHaveTextContent('Disponível: 1 kg')
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDisabled()
  })

  it('ao alterar a densidade, preserva o volume já debitado de um material em litros', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'l', quantidadeEstoque: 8, custoUnitario: 100 })
    const formaId = await db.formas.add({ nome: 'Molde em litros', geometria: 'retangular', dimensoesCm: { comprimento: 10, largura: 8, profundidade: 2 }, volumeDiretoMl: 160, vidaUtilUsos: 100, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, custoSiliconeFabricacao: 200, baixaSiliconeConfirmada: true, dimensoesCaixaSiliconeCm: { comprimento: 20, largura: 15, altura: 10 }, densidadeSiliconeGcm3: 1.1 })
    render(<ToastProvider><FormasPage /></ToastProvider>)
    await screen.findByText('Molde em litros')
    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    fireEvent.change(screen.getByLabelText(/densidade do silicone/i), { target: { value: '1,2' } })
    await waitFor(() => expect(screen.getByLabelText(/quantidade de silicone realmente usada/i)).toHaveValue(2.4))
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument())
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect((await db.formas.get(formaId))?.quantidadeSiliconeUsada).toBe(2)
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
