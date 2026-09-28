import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { PerfilPage } from './PerfilPage'

describe('PerfilPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('renderiza o título da gestão de perfil e mostra o perfil ativo', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    expect(screen.getByText('Gestão de Perfis de Ateliê')).toBeInTheDocument()
    expect(screen.getAllByText(/Ateliê Principal/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/✓ Ativo Agora/i)).toBeInTheDocument()
  })

  it('abre formulário ao clicar em "+ Novo Ateliê"', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /\+ novo ateliê/i }))
    expect(screen.getByText('Cadastrar Novo Perfil de Ateliê')).toBeInTheDocument()
  })
})
