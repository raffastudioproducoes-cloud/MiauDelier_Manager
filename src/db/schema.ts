import Dexie, { type EntityTable } from 'dexie'

export interface CategoriaMaterial {
  id?: number
  nome: string
}

export interface Material {
  id?: number
  nome: string
  categoriaId: number
  unidade: string
  quantidadeEstoque: number
  custoUnitario: number
}

export type FormaGeometria = 'retangular' | 'cilindrico' | 'esferico' | 'direto'

export interface Forma {
  id?: number
  nome: string
  geometria: FormaGeometria
  dimensoesCm: { comprimento?: number; largura?: number; profundidade?: number; raio?: number; altura?: number }
  volumeDiretoMl?: number
}

export type StatusPeca = 'planejada' | 'em_producao' | 'curando' | 'acabamento' | 'pronta' | 'vendida'

export interface Peca {
  id?: number
  nome: string
  formaId: number
  status: StatusPeca
  criadaEm: string
}

export interface ConsumoPeca {
  id?: number
  pecaId: number
  materialId: number
  quantidade: number
}

export interface EventoPeca {
  id?: number
  pecaId: number
  tipo: string
  descricao: string
  criadoEm: string
}

export interface Cliente {
  id?: number
  nome: string
  contato?: string
}

export type StatusPedido = 'aberto' | 'em_producao' | 'entregue' | 'cancelado'

export interface Pedido {
  id?: number
  clienteId: number
  pecaIds: number[]
  status: StatusPedido
  criadoEm: string
}

export type TipoTransacao = 'entrada' | 'saida'

export interface Transacao {
  id?: number
  contaId: number
  tipo: TipoTransacao
  valorCriptografado: string
  descricao: string
  data: string
}

export interface Conta {
  id?: number
  nome: string
  saldoCriptografado: string
}

export interface Configuracao {
  id?: number
  chave: string
  valor: string
}

export interface RegistroAuditoria {
  id?: number
  entidade: string
  entidadeId: number
  quem: string
  quando: string
  valorAnterior?: string
  valorNovo?: string
}

export interface MetaBackup {
  id?: number
  criadoEm: string
  checksum: string
  tamanhoBytes: number
}

class MiauDelierDB extends Dexie {
  categoriasMaterial!: EntityTable<CategoriaMaterial, 'id'>
  materiais!: EntityTable<Material, 'id'>
  formas!: EntityTable<Forma, 'id'>
  pecas!: EntityTable<Peca, 'id'>
  consumosPeca!: EntityTable<ConsumoPeca, 'id'>
  eventosPeca!: EntityTable<EventoPeca, 'id'>
  clientes!: EntityTable<Cliente, 'id'>
  pedidos!: EntityTable<Pedido, 'id'>
  transacoes!: EntityTable<Transacao, 'id'>
  contas!: EntityTable<Conta, 'id'>
  configuracoes!: EntityTable<Configuracao, 'id'>
  auditoria!: EntityTable<RegistroAuditoria, 'id'>
  backups!: EntityTable<MetaBackup, 'id'>

  constructor() {
    super('MiauDelierManager')
    this.version(1).stores({
      categoriasMaterial: '++id, nome',
      materiais: '++id, nome, categoriaId',
      formas: '++id, nome, geometria',
      pecas: '++id, nome, formaId, status',
      consumosPeca: '++id, pecaId, materialId',
      eventosPeca: '++id, pecaId, tipo, criadoEm',
      clientes: '++id, nome',
      pedidos: '++id, clienteId, status, *pecaIds',
      transacoes: '++id, contaId, tipo, data',
      contas: '++id, nome',
      configuracoes: '++id, &chave',
      auditoria: '++id, entidade, entidadeId, quando',
      backups: '++id, criadoEm',
    })
  }
}

export const db = new MiauDelierDB()
