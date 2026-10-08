import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import {
  sanitizarDadoLog,
  registrarLog,
  logInfo,
  logWarn,
  logError,
  listarLogsSistema,
  limparLogsSistema,
  exportarLogsComoTexto,
  exportarLogsComoJSON,
} from './logger'

describe('Módulo de Logging de Sistema (logger)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await limparLogsSistema()
  })

  describe('sanitizarDadoLog', () => {
    it('mascara propriedades sensíveis como senha, password, hash, key, token', () => {
      const objetoSensivel = {
        usuario: 'rafael',
        senha: 'minhasenhasecreta123',
        password: 'password123',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        token: 'secret-token-abc',
        saldoCriptografado: 'cifrado:12345',
        dadosNormais: {
          item: 'Resina Epóxi',
          quantidade: 5,
        },
      }

      const sanitizado = sanitizarDadoLog(objetoSensivel) as Record<string, unknown>

      expect(sanitizado.usuario).toBe('rafael')
      expect(sanitizado.senha).toBe('[REDACTED]')
      expect(sanitizado.password).toBe('[REDACTED]')
      expect(sanitizado.hash).toBe('[REDACTED]')
      expect(sanitizado.token).toBe('[REDACTED]')
      expect(sanitizado.saldoCriptografado).toBe('[REDACTED]')
      expect(sanitizado.dadosNormais).toEqual({
        item: 'Resina Epóxi',
        quantidade: 5,
      })
    })

    it('mascara chaves hexadecimais de 64 caracteres de chave mestra', () => {
      const chaveHex = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
      expect(sanitizarDadoLog(chaveHex)).toBe('[CHAVE_CRIPTOGRAFICA_OMITIDA]')
    })

    it('mascara strings em JSON com propriedades sensíveis', () => {
      const jsonStr = JSON.stringify({ action: 'login', password: '123' })
      const resultado = sanitizarDadoLog(jsonStr) as string
      expect(resultado).toContain('[REDACTED]')
      expect(resultado).not.toContain('123')
    })

    it('omite texto excessivamente longo antes de analisá-lo', () => {
      expect(sanitizarDadoLog('a'.repeat(10_001))).toBe('[TEXTO_LONGO_OMITIDO]')
    })
  })

  describe('registrarLog e listagem', () => {
    it('registra e lista logs de diferentes níveis', async () => {
      await logInfo('ui', 'Usuário abriu a página de Peças')
      await logWarn('estoque', 'Estoque de resina atingiu o nível mínimo', { qtd: 200 })
      await logError('banco', 'Erro ao salvar peça no banco', new Error('Falha de transação Dexie'))

      const logs = await listarLogsSistema()
      expect(logs).toHaveLength(3)

      expect(logs[0].nivel).toBe('error')
      expect(logs[0].origem).toBe('banco')
      expect(logs[0].mensagem).toBe('Erro ao salvar peça no banco')

      expect(logs[1].nivel).toBe('warn')
      expect(logs[2].nivel).toBe('info')
    })

    it('filtra logs por nível', async () => {
      await logInfo('ui', 'Navegação')
      await logError('banco', 'Erro banco')

      const apenasErros = await listarLogsSistema({ nivel: 'error' })
      expect(apenasErros).toHaveLength(1)
      expect(apenasErros[0].mensagem).toBe('Erro banco')
    })

    it('filtra logs por busca textual', async () => {
      await logInfo('producao', 'Iniciou mistura de resina para Mesa Acrílica')
      await logInfo('vendas', 'Novo pedido criado')

      const buscaMesa = await listarLogsSistema({ busca: 'mesa' })
      expect(buscaMesa).toHaveLength(1)
      expect(buscaMesa[0].mensagem).toContain('Mesa Acrílica')
    })
  })

  describe('exportação e limpeza', () => {
    it('exporta logs para texto e JSON', async () => {
      await registrarLog('info', 'teste', 'Mensagem de teste', { detalhe: 'ok' })
      const logs = await listarLogsSistema()

      const txt = exportarLogsComoTexto(logs)
      const json = exportarLogsComoJSON(logs)

      expect(txt).toContain('[INFO]')
      expect(txt).toContain('Mensagem de teste')
      expect(json).toContain('Mensagem de teste')
    })

    it('limpa logs do banco e da memória', async () => {
      await logInfo('ui', 'Teste antes de limpar')
      expect(await listarLogsSistema()).toHaveLength(1)

      await limparLogsSistema()
      expect(await listarLogsSistema()).toHaveLength(0)
    })
  })
})
