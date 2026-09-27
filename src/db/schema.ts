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

export interface CavidadeForma {
  id: string
  nome?: string
  comprimentoCm?: number
  larguraCm?: number
  profundidadeCm?: number
  volumeManualMl?: number
}

export type StatusForma = 'em_preparo' | 'curando' | 'pronta'

export interface Forma {
  id?: number
  nome: string
  geometria: FormaGeometria
  dimensoesCm: { comprimento?: number; largura?: number; profundidade?: number; raio?: number; altura?: number }
  volumeDiretoMl?: number
  custoFabricacao?: number
  vidaUtilUsos?: number
  usosRealizados?: number
  materialSiliconeId?: number
  quantidadeSiliconeUsada?: number
  curaIniciadaEm?: number
  curaMinutos?: number
  status?: StatusForma
  cavidades?: CavidadeForma[]
}


export type StatusPeca = 'planejada' | 'em_producao' | 'curando' | 'acabamento' | 'pronta' | 'vendida' | 'cancelada'

export interface UsoEnergiaPeca {
  equipamentoId: number
  nomeEquipamento: string
  potenciaWatts: number
  minutosUso: number
}

export interface Peca {
  id?: number
  numeroSerie?: string
  nome: string
  formaId: number
  status: StatusPeca
  criadaEm: string
  precoVenda?: number
  curaIniciadaEm?: number
  curaMinutos?: number
  tipoProcesso?: string
  duracaoProcessoMinutos?: number
  horasMaoDeObra?: number
  maoDeObraFixa?: number
  usosEnergia?: UsoEnergiaPeca[]
  percentualTaxas?: number
  margemDesejada?: number
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
  prazoEntrega?: string
  etapa?: string
  progresso?: number
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
  acao: 'exclusao' | 'alteracao_preco' | 'venda'
  valorAnterior?: string
  valorNovo?: string
}

export interface MetaBackup {
  id?: number
  criadoEm: string
  checksum: string
  tamanhoBytes: number
}

export type PapelMensagemIA = 'usuario' | 'assistente'

export interface MensagemIA {
  id?: number
  papel: PapelMensagemIA
  texto: string
  criadoEm: string
}

export interface Notificacao {
  id?: number
  titulo: string
  mensagem: string
  lida: boolean
  criadoEm: string
}

export interface Equipamento {
  id?: number
  nome: string
  potenciaWatts: number
  criadoEm: string
}

export interface Taxa {
  id?: number
  nome: string
  percentual: number
  valorFixo: number
  criadoEm: string
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
  mensagensIA!: EntityTable<MensagemIA, 'id'>
  notificacoes!: EntityTable<Notificacao, 'id'>
  equipamentos!: EntityTable<Equipamento, 'id'>
  taxas!: EntityTable<Taxa, 'id'>

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
    this.version(2).stores({
      mensagensIA: '++id, criadoEm',
    })
    this.version(3).stores({
      notificacoes: '++id, lida, criadoEm',
      equipamentos: '++id, nome',
      taxas: '++id, nome',
    })
  }
}

export const db = new MiauDelierDB()

