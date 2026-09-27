import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { DiagnosticoPage } from './DiagnosticoPage'

describe('DiagnosticoPage UI', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('renderiza o título do diagnóstico e calcula a nota', async () => {
    render(<DiagnosticoPage />)

    expect(await screen.findByText(/diagnóstico & saúde financeira/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/índice de saúde financeira/i)).toBeInTheDocument())
  })
})
