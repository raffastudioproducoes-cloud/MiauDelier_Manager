import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Radio } from './Radio'

describe('Radio', () => {
  it('renderiza marcado quando checked é true', () => {
    render(<Radio id="cor-azul" name="cor" label="Azul" checked onChange={() => {}} />)
    expect(screen.getByLabelText('Azul')).toBeChecked()
  })

  it('renderiza desmarcado quando checked é false', () => {
    render(<Radio id="cor-azul" name="cor" label="Azul" checked={false} onChange={() => {}} />)
    expect(screen.getByLabelText('Azul')).not.toBeChecked()
  })

  it('chama onChange com o novo estado ao clicar', () => {
    const aoMudar = vi.fn()
    render(<Radio id="cor-azul" name="cor" label="Azul" checked={false} onChange={aoMudar} />)
    fireEvent.click(screen.getByLabelText('Azul'))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })
})
