import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renderiza children dentro de um contêiner com efeito de vidro', () => {
    render(<Card>Conteúdo</Card>)
    const conteudo = screen.getByText('Conteúdo')
    expect(conteudo).toHaveClass('glass-card')
  })
})
