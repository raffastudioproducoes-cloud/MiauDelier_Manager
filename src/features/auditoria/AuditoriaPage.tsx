import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { listarAuditoria } from './auditoriaRepo'
import type { RegistroAuditoria } from '../../db/schema'

function formatarQuando(quando: string) {
  return new Date(quando).toLocaleString('pt-BR')
}

function descricaoAcao(registro: RegistroAuditoria) {
  if (registro.acao === 'exclusao') return 'Exclusão'
  if (registro.acao === 'venda') return `Venda: R$ ${registro.valorNovo}`
  return `Preço alterado: R$ ${registro.valorAnterior} → R$ ${registro.valorNovo}`
}

export function AuditoriaPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    montado.current = true
    listarAuditoria()
      .then((lista) => {
        if (!montado.current) return
        setRegistros(lista)
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar auditoria.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!carregado) {
    return null
  }

  const totalExclusoes = registros.filter((r) => r.acao === 'exclusao').length
  const totalVendas = registros.filter((r) => r.acao === 'venda').length
  const totalAlteracoes = registros.filter((r) => r.acao === 'alteracao_preco').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Auditoria & Histórico</h1>
        <p className="text-label-sm text-on-surface-variant">
          Linha do tempo de ações sensíveis: exclusões, vendas e alterações de preço no ateliê.
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="flex flex-col gap-1 p-3">
          <span className="text-xs text-on-surface-variant font-medium">Total de Registros</span>
          <span className="text-xl font-bold text-on-surface">{registros.length}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-3 border-l-4 border-l-success">
          <span className="text-xs text-on-surface-variant font-medium">Vendas</span>
          <span className="text-xl font-bold text-success">{totalVendas}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-3 border-l-4 border-l-primary">
          <span className="text-xs text-on-surface-variant font-medium">Alterações de Preço</span>
          <span className="text-xl font-bold text-primary">{totalAlteracoes}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-3 border-l-4 border-l-error">
          <span className="text-xs text-on-surface-variant font-medium">Exclusões</span>
          <span className="text-xl font-bold text-error">{totalExclusoes}</span>
        </Card>
      </div>

      {registros.length === 0 ? (
        <EmptyState titulo="Nenhum registro de auditoria" descricao="Ações sensíveis aparecerão aqui em linha do tempo." />
      ) : (
        <div className="relative pl-6 sm:pl-32 flex flex-col gap-5 before:absolute before:left-2.5 sm:before:left-[108px] before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/40 before:border-r before:border-dashed before:border-outline-variant/60">
          {registros.map((registro) => {
            const ehExclusao = registro.acao === 'exclusao'
            const ehVenda = registro.acao === 'venda'

            return (
              <div key={registro.id} className="relative flex flex-col sm:flex-row items-start gap-4">
                {/* Rótulo Esquerda (Desktop) */}
                <div className="hidden sm:flex flex-col items-end w-24 shrink-0 pt-1 text-right">
                  <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                    {registro.entidade}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    #{registro.entidadeId}
                  </span>
                </div>

                {/* Marcador Central da Linha do Tempo (Node Dot) */}
                <div className="absolute -left-6 sm:static sm:left-auto pt-1 shrink-0 z-10">
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shadow-sm ${
                      ehExclusao
                        ? 'border-error bg-error/20 text-error'
                        : ehVenda
                        ? 'border-success bg-success/20 text-success'
                        : 'border-primary bg-primary/20 text-primary'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </div>
                </div>

                {/* Card de Conteúdo à Direita */}
                <Card className="flex-1 w-full glow-hover flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="sm:hidden text-xs font-semibold uppercase text-on-surface">
                        {registro.entidade} #{registro.entidadeId}
                      </span>
                      {ehExclusao && (
                        <span className="text-[11px] font-bold uppercase text-error bg-error/10 px-2 py-0.5 rounded border border-error/20">
                          🗑️ Exclusão
                        </span>
                      )}
                      {ehVenda && (
                        <span className="text-[11px] font-bold uppercase text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
                          💰 Venda
                        </span>
                      )}
                      {!ehExclusao && !ehVenda && (
                        <span className="text-[11px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          🏷️ Alteração de Preço
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-on-surface-variant font-mono">
                      📅 {formatarQuando(registro.quando)}
                    </span>
                  </div>

                  <div className="text-sm font-medium text-on-surface pt-1">
                    {descricaoAcao(registro)}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      👤 Responsável: <strong className="text-on-surface font-normal">{registro.quem}</strong>
                    </span>
                    <span className="text-[11px] text-on-surface-variant/80 font-mono">
                      Registro #{registro.id}
                    </span>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
