import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from './Tabs'

const abas = [
  { id: 'um', rotulo: 'Aba Um', conteudo: <p>Conteúdo Um</p> },
  { id: 'dois', rotulo: 'Aba Dois', conteudo: <p>Conteúdo Dois</p> },
]

describe('Tabs', () => {
  it('renderiza os rótulos de todas as abas', () => {
    render(<Tabs abas={abas} />)
    expect(screen.getByText('Aba Um')).toBeInTheDocument()
    expect(screen.getByText('Aba Dois')).toBeInTheDocument()
  })

  it('mostra só o conteúdo da aba ativa', () => {
    render(<Tabs abas={abas} />)
    expect(screen.getByText('Conteúdo Um')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo Dois')).not.toBeInTheDocument()
  })

  it('clicar numa aba troca o conteúdo visível', () => {
    render(<Tabs abas={abas} />)
    fireEvent.mouseDown(screen.getByText('Aba Dois'))
    fireEvent.click(screen.getByText('Aba Dois'))
    expect(screen.getByText('Conteúdo Dois')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo Um')).not.toBeInTheDocument()
  })

  it('no modo controlado avisa onMudarAba com o id da aba clicada e não troca sozinho', () => {
    const onMudarAba = vi.fn()
    render(<Tabs abas={abas} abaAtiva="um" onMudarAba={onMudarAba} />)

    fireEvent.mouseDown(screen.getByText('Aba Dois'))
    fireEvent.click(screen.getByText('Aba Dois'))

    expect(onMudarAba).toHaveBeenCalledWith('dois')
    // abaAtiva não mudou: quem controla é o pai, não o componente.
    expect(screen.getByText('Conteúdo Um')).toBeInTheDocument()
  })
})
