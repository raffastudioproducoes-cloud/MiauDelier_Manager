import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SeletorImagem } from './SeletorImagem'

describe('SeletorImagem', () => {
  it('renders default prompt when no image is provided', () => {
    const onImagemSelecionada = vi.fn()
    render(<SeletorImagem onImagemSelecionada={onImagemSelecionada} />)

    expect(screen.getByText('Tirar Foto (Câmera)')).toBeInTheDocument()
    expect(screen.getByText('Escolher da Memória / Galeria')).toBeInTheDocument()
  })

  it('renders image preview and remove button when imagemUrl is provided', () => {
    const onImagemSelecionada = vi.fn()
    render(
      <SeletorImagem
        imagemUrl="data:image/jpeg;base64,12345"
        onImagemSelecionada={onImagemSelecionada}
      />,
    )

    expect(screen.getByAltText('Preview')).toBeInTheDocument()
    const removerBtn = screen.getByText('🗑️ Remover')
    expect(removerBtn).toBeInTheDocument()

    fireEvent.click(removerBtn)
    expect(onImagemSelecionada).toHaveBeenCalledWith(undefined)
  })
})
