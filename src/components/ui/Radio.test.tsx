import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Radio } from './Radio'

describe('Radio', () => {
  it('renderiza marcado quando marcado é true', () => {
    render(<Radio id="cor-azul" name="cor" rotulo="Azul" marcado aoMudar={() => {}} />)
    expect(screen.getByLabelText('Azul')).toBeChecked()
  })

  it('renderiza desmarcado quando marcado é false', () => {
    render(<Radio id="cor-azul" name="cor" rotulo="Azul" marcado={false} aoMudar={() => {}} />)
    expect(screen.getByLabelText('Azul')).not.toBeChecked()
  })

  it('chama aoMudar com o novo estado ao clicar', () => {
    const aoMudar = vi.fn()
    render(<Radio id="cor-azul" name="cor" rotulo="Azul" marcado={false} aoMudar={aoMudar} />)
    fireEvent.click(screen.getByLabelText('Azul'))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })
})
