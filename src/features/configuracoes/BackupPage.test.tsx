import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { BackupPage } from './BackupPage'

describe('BackupPage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('exporta um backup ao clicar em "Exportar backup"', async () => {
    const criarObjectURLMock = vi.fn(() => 'blob:mock-url')
    vi.stubGlobal('URL', { ...URL, createObjectURL: criarObjectURLMock, revokeObjectURL: vi.fn() })

    render(<ToastProvider><BackupPage /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: /exportar backup/i }))

    await waitFor(() => expect(criarObjectURLMock).toHaveBeenCalled())
    vi.unstubAllGlobals()
  })

  it('mostra mensagem de erro quando o arquivo de importação é inválido', async () => {
    render(<ToastProvider><BackupPage /></ToastProvider>)

    const arquivo = new File(['{ "json": "invalido, sem campos" }'], 'backup.json', { type: 'application/json' })
    const input = screen.getByLabelText(/importar backup/i) as HTMLInputElement
    await fireEvent.change(input, { target: { files: [arquivo] } })

    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('abre modal de confirmação e apaga os dados ao confirmar', async () => {
    await db.materiais.add({ nome: 'Resina Teste', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    expect(await db.materiais.count()).toBe(1)

    render(<ToastProvider><BackupPage /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: /apagar dados \(manter perfil\)/i }))
    expect(await screen.findByText(/apagar todos os dados do ateliê\?/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(async () => {
      expect(await db.materiais.count()).toBe(0)
    })
  })
})

