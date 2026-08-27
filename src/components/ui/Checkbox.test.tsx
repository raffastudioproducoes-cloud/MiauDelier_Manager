import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renderiza marcado quando checked é true', () => {
    render(<Checkbox id="aceite" label="Aceito os termos" checked onChange={() => {}} />)
    expect(screen.getByLabelText('Aceito os termos')).toBeChecked()
  })

  it('renderiza desmarcado quando checked é false', () => {
    render(<Checkbox id="aceite" label="Aceito os termos" checked={false} onChange={() => {}} />)
    expect(screen.getByLabelText('Aceito os termos')).not.toBeChecked()
  })

  it('chama onChange com o novo estado ao clicar', () => {
    const aoMudar = vi.fn()
    render(<Checkbox id="aceite" label="Aceito os termos" checked={false} onChange={aoMudar} />)
    fireEvent.click(screen.getByLabelText('Aceito os termos'))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })
})
