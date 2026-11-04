import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { carregarRascunhoFormulario, limparRascunhoFormulario, salvarRascunhoFormulario, coletarCamposPersistiveis } from './formDrafts'

describe('rascunhos de formulário', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('salva, recupera e remove um rascunho isolado por conta, perfil e rota', async () => {
    const args = {
      usuarioId: 'user-1',
      perfilId: 'perfil-1',
      rota: '/materiais',
      formulario: 'material',
      campos: { nome: 'Resina', quantidade: '2' },
    }
    await salvarRascunhoFormulario(args)

    await expect(carregarRascunhoFormulario('user-1', 'perfil-1', '/materiais', 'material')).resolves.toMatchObject({ campos: args.campos })
    await expect(carregarRascunhoFormulario('user-2', 'perfil-1', '/materiais', 'material')).resolves.toBeUndefined()
    await expect(carregarRascunhoFormulario('user-1', 'perfil-2', '/materiais', 'material')).resolves.toBeUndefined()

    await limparRascunhoFormulario('user-1', 'perfil-1', '/materiais', 'material')
    await expect(carregarRascunhoFormulario('user-1', 'perfil-1', '/materiais', 'material')).resolves.toBeUndefined()
  })

  it('não inclui senha, token nem arquivo nos campos persistidos', () => {
    const form = document.createElement('form')
    form.innerHTML = '<input name="nome" value="Ateliê"><input name="password" value="privada"><input name="api_key" value="privada"><input name="access_token" value="privado"><input type="file" name="foto">'

    expect(coletarCamposPersistiveis(form)).toEqual({ nome: 'Ateliê' })
  })
})
