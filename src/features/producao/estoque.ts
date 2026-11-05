import type { Material } from '../../db/schema'
import { converterQuantidade } from '../../lib/unidades'

const UNIDADES_MASSA = ['g', 'grama', 'gramas', 'kg', 'kilo', 'quilograma', 'quilogramas']
const UNIDADES_VOLUME = ['ml', 'l', 'litro', 'litros']

export function siliconeKgParaEstoque(kg: number, unidade: string, densidade: number): number | null {
  const chave = unidade.trim().toLowerCase()
  if (!Number.isFinite(kg) || kg < 0 || !Number.isFinite(densidade) || densidade <= 0) return null
  if (UNIDADES_MASSA.includes(chave)) return converterQuantidade(kg, 'kg', chave).quantidadeConvertida
  if (UNIDADES_VOLUME.includes(chave)) return converterQuantidade(kg / densidade, 'l', chave).quantidadeConvertida
  return null
}

export function siliconeEstoqueParaKg(quantidade: number, unidade: string, densidade: number): number | null {
  const chave = unidade.trim().toLowerCase()
  if (!Number.isFinite(quantidade) || quantidade < 0 || !Number.isFinite(densidade) || densidade <= 0) return null
  if (UNIDADES_MASSA.includes(chave)) return converterQuantidade(quantidade, chave, 'kg').quantidadeConvertida
  if (UNIDADES_VOLUME.includes(chave)) return converterQuantidade(quantidade, chave, 'l').quantidadeConvertida * densidade
  return null
}

export function mensagemEstoqueInsuficiente(material: Material, necessario: number): string | null {
  if (!Number.isFinite(necessario) || necessario < 0 || !Number.isFinite(material.quantidadeEstoque) || material.quantidadeEstoque < 0) {
    return `Quantidade ou saldo inválido para "${material.nome}".`
  }
  if (necessario <= material.quantidadeEstoque) return null
  const formatar = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
  return `Estoque insuficiente de "${material.nome}"! Necessário: ${formatar(necessario)} ${material.unidade} | Disponível: ${formatar(material.quantidadeEstoque)} ${material.unidade} | Faltam: ${formatar(necessario - material.quantidadeEstoque)} ${material.unidade}. Faça a reposição para continuar.`
}

export function exigirEstoque(material: Material, necessario: number): void {
  const erro = mensagemEstoqueInsuficiente(material, necessario)
  if (erro) throw new Error(erro)
}

export const ERRO_CONEXAO_ESTOQUE = 'Conecte-se à internet para registrar uma baixa de estoque. O rascunho pode ser mantido até a reconexão.'

export function exigirConexaoEstoque(): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error(ERRO_CONEXAO_ESTOQUE)
}
