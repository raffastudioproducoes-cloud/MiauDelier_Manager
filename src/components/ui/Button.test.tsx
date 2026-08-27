import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza o texto e responde a clique', () => {
    const aoClicar = vi.fn()
    render(<Button onClick={aoClicar}>Enviar</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(aoClicar).toHaveBeenCalledOnce()
  })

  it('não dispara clique quando desabilitado', () => {
    const aoClicar = vi.fn()
    render(<Button onClick={aoClicar} disabled>Enviar</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(aoClicar).not.toHaveBeenCalled()
  })
})
