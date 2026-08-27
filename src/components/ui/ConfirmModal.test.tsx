import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  it('não renderiza conteúdo quando aberto={false}', () => {
    render(
      <ConfirmModal aberto={false} titulo="Excluir peça" onConfirmar={vi.fn()} onCancelar={vi.fn()} />,
    )
    expect(screen.queryByText('Excluir peça')).not.toBeInTheDocument()
  })

  it('renderiza título e descrição quando aberto={true}', () => {
    render(
      <ConfirmModal
        aberto
        titulo="Excluir peça"
        descricao="Essa ação não pode ser desfeita."
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    )
    expect(screen.getByText('Excluir peça')).toBeInTheDocument()
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument()
  })

  it('chama onConfirmar ao clicar em Confirmar', () => {
    const onConfirmar = vi.fn()
    render(<ConfirmModal aberto titulo="Excluir peça" onConfirmar={onConfirmar} onCancelar={vi.fn()} />)
    fireEvent.click(screen.getByText('Confirmar'))
    expect(onConfirmar).toHaveBeenCalledOnce()
  })

  it('chama onCancelar ao clicar em Cancelar', () => {
    const onCancelar = vi.fn()
    render(<ConfirmModal aberto titulo="Excluir peça" onConfirmar={vi.fn()} onCancelar={onCancelar} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onCancelar).toHaveBeenCalledOnce()
  })

  it('chama onCancelar ao pressionar Esc', () => {
    const onCancelar = vi.fn()
    render(<ConfirmModal aberto titulo="Excluir peça" onConfirmar={vi.fn()} onCancelar={onCancelar} />)
    fireEvent.keyDown(screen.getByText('Excluir peça'), { key: 'Escape', code: 'Escape' })
    expect(onCancelar).toHaveBeenCalledOnce()
  })
})
