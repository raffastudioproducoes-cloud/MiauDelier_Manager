import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('não mostra o conteúdo por padrão', () => {
    render(
      <Tooltip conteudo="Dica útil">
        <button>Gatilho</button>
      </Tooltip>,
    )
    expect(screen.queryByText('Dica útil')).not.toBeInTheDocument()
  })

  it('mostra o conteúdo ao focar no gatilho', async () => {
    render(
      <Tooltip conteudo="Dica útil">
        <button>Gatilho</button>
      </Tooltip>,
    )
    fireEvent.focus(screen.getByText('Gatilho'))
    expect(await screen.findAllByText('Dica útil')).not.toHaveLength(0)
  })
})
