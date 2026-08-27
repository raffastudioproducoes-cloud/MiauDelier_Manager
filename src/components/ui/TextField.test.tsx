import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextField } from './TextField'

describe('TextField', () => {
  it('associa o label ao input via htmlFor/id', () => {
    render(<TextField id="nome" rotulo="Nome" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
  })

  it('mostra a mensagem de erro com role alert quando fornecida', () => {
    render(<TextField id="nome" rotulo="Nome" value="" onChange={() => {}} erro="Campo obrigatório" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
  })

  it('não mostra alerta quando não há erro', () => {
    render(<TextField id="nome" rotulo="Nome" value="" onChange={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('associa o erro ao input via aria-describedby', () => {
    render(<TextField id="nome" rotulo="Nome" value="" onChange={() => {}} erro="Campo obrigatório" />)
    const input = screen.getByLabelText('Nome')
    const erro = screen.getByRole('alert')
    expect(input).toHaveAttribute('aria-describedby', erro.id)
  })
})
