import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renderiza marcado quando marcado é true', () => {
    render(<Checkbox id="aceite" rotulo="Aceito os termos" marcado aoMudar={() => {}} />)
    expect(screen.getByLabelText('Aceito os termos')).toBeChecked()
  })

  it('renderiza desmarcado quando marcado é false', () => {
    render(<Checkbox id="aceite" rotulo="Aceito os termos" marcado={false} aoMudar={() => {}} />)
    expect(screen.getByLabelText('Aceito os termos')).not.toBeChecked()
  })

  it('chama aoMudar com o novo estado ao clicar', () => {
    const aoMudar = vi.fn()
    render(<Checkbox id="aceite" rotulo="Aceito os termos" marcado={false} aoMudar={aoMudar} />)
    fireEvent.click(screen.getByLabelText('Aceito os termos'))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })
})
