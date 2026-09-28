import Dexie, { type EntityTable } from 'dexie'
import { getDbNameForPerfil } from '../lib/perfisRepo'

export type TipoClassificacaoMaterial = 'consumivel' | 'ferramenta' | 'administrativo' | 'epi'

export interface CategoriaMaterial {
  id?: number
  nome: string
  categoriaPaiId?: number
  tipoClassificacao?: TipoClassificacaoMaterial
}

export interface Material {
  id?: number
  nome: string
  categoriaId: number
  subcategoriaId?: number
  unidade: string
  quantidadeEstoque: number
  custoUnitario: number
  valorFrete?: number
  tipoClassificacao?: TipoClassificacaoMaterial
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

export interface FuroVazadoForma {
  id: string
  nome?: string
  geometria: 'circulo' | 'retangulo'
  quantidade: number
  diametroCm?: number
  comprimentoCm?: number
  larguraCm?: number
  profundidadeCm?: number
}

export interface PeMesaForma {
  quantidade: number
  geometria: 'cilindrico' | 'retangular'
  raioCm?: number
  alturaCm?: number
  comprimentoCm?: number
  larguraCm?: number
}

export type StatusForma = 'em_preparo' | 'curando' | 'pronta'

export interface Forma {
  id?: number
  nome: string
  geometria: FormaGeometria
  dimensoesCm: { comprimento?: number; largura?: number; profundidade?: number; raio?: number; altura?: number }
  volumeDiretoMl?: number
  custoFabricacao?: number
  custoCaixaEstrutura?: number
  materialCaixaEstrutura?: string
  vidaUtilUsos?: number
  usosRealizados?: number
  materialSiliconeId?: number
  quantidadeSiliconeUsada?: number
  curaIniciadaEm?: number
  curaMinutos?: number
  status?: StatusForma
  cavidades?: CavidadeForma[]
  furosVazados?: FuroVazadoForma[]
  pesMesa?: PeMesaForma
  margemSegurancaPercentual?: number
  massaResinaKg?: number
  litrosResina?: number
  imagemUrl?: string
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
  imagemUrl?: string
  volumeResinaMl?: number
  litrosAgua?: number
  custoAgua?: number
  custoEpiInsumos?: number
  valorPropagandaTotal?: number
  diasPropaganda?: number
  custoPropagandaCalculado?: number
  valorFrete?: number
}

export interface ConsumoPeca {
  id?: number
  pecaId: number
  materialId: number
  quantidade: number
  unidade?: string
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
  valorCompra?: number
  descricao?: string
  vidaUtilHoras?: number
  criadoEm: string
}

export interface Taxa {
  id?: number
  nome: string
  percentual: number
  valorFixo: number
  criadoEm: string
}

export type NivelLog = 'info' | 'warn' | 'error' | 'debug'

export interface LogSistema {
  id?: number
  timestamp: string
  nivel: NivelLog
  origem: string
  mensagem: string
  detalhes?: Record<string, unknown> | string
  stack?: string
}

export class MiauDelierDB extends Dexie {
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
  logs!: EntityTable<LogSistema, 'id'>

  constructor(dbName?: string) {
    super(dbName || getDbNameForPerfil())
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
    this.version(4).stores({
      categoriasMaterial: '++id, nome, categoriaPaiId',
      materiais: '++id, nome, categoriaId, subcategoriaId',
    })
    this.version(5).stores({
      logs: '++id, nivel, timestamp, origem',
    })
  }
}

export const db = new MiauDelierDB()

