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

  it('exibe opção de excluir perfil e abre modal de confirmação ao clicar', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    const botoesExcluir = screen.getAllByRole('button', { name: /excluir perfil/i })
    expect(botoesExcluir.length).toBeGreaterThan(0)

    fireEvent.click(botoesExcluir[0])
    expect(screen.getByText(/Limpar e Restaurar Perfil Principal\?/i)).toBeInTheDocument()
  })

  it('exibe botão de excluir perfil ao editar um perfil existente', async () => {
    render(
      <ToastProvider>
        <PerfilPage />
      </ToastProvider>,
    )

    const botaoEditar = screen.getByRole('button', { name: /editar perfil/i })
    fireEvent.click(botaoEditar)

    expect(screen.getByText('Editar Perfil do Ateliê')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /excluir este perfil/i })).toBeInTheDocument()
  })
})

