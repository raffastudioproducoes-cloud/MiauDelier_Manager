import { useEffect, useState, useCallback } from 'react'
import type { LogSistema, NivelLog } from '../../db/schema'
import {
  listarLogsSistema,
  limparLogsSistema,
  exportarLogsComoTexto,
  exportarLogsComoJSON,
} from '../../lib/logger'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { TextField } from '../../components/ui/TextField'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'

export function LogsPage() {
  const { mostrarToast } = useToast()
  const [logs, setLogs] = useState<LogSistema[]>([])
  const [nivelFiltro, setNivelFiltro] = useState<NivelLog | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [modalLimparAberto, setModalLimparAberto] = useState(false)
  const [itemExpandidoId, setItemExpandidoId] = useState<number | string | null>(null)

  const carregarLogs = useCallback(async () => {
    const lista = await listarLogsSistema({
      nivel: nivelFiltro,
      busca,
    })
    setLogs(lista)
  }, [nivelFiltro, busca])

  useEffect(() => {
    carregarLogs()
  }, [carregarLogs])

  const handleLimparLogs = async () => {
    await limparLogsSistema()
    setModalLimparAberto(false)
    mostrarToast('Logs do sistema limpos com sucesso.')
    carregarLogs()
  }

  const handleBaixarTexto = () => {
    const conteudo = exportarLogsComoTexto(logs)
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-miaudelier-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    mostrarToast('Arquivo de logs em texto (.txt) baixado.')
  }

  const handleBaixarJSON = () => {
    const conteudo = exportarLogsComoJSON(logs)
    const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-miaudelier-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    mostrarToast('Arquivo de logs em JSON baixado.')
  }

  const handleCopiarLogs = () => {
    const conteudo = exportarLogsComoTexto(logs)
    navigator.clipboard.writeText(conteudo)
    mostrarToast('Logs copiados para a área de transferência!')
  }

  const getVariantBadge = (nivel: NivelLog) => {
    switch (nivel) {
      case 'error':
        return 'danger'
      case 'warn':
        return 'warning'
      case 'info':
        return 'success'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Logs do Sistema</h1>
          <p className="text-label-sm text-on-surface-variant">
            Inspeção e captura de eventos e falhas silenciosas (dados sensíveis e senhas são estritamente omitidos).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 sm:pt-0">
          <Button variante="ghost" onClick={handleBaixarTexto}>
            📥 Baixar (.txt)
          </Button>
          <Button variante="ghost" onClick={handleBaixarJSON}>
            📥 Baixar (.json)
          </Button>
          <Button variante="ghost" onClick={handleCopiarLogs}>
            📋 Copiar
          </Button>
          <Button variante="ghost" onClick={() => setModalLimparAberto(true)}>
            🧹 Limpar
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(['todos', 'error', 'warn', 'info', 'debug'] as const).map((nivel) => (
            <button
              key={nivel}
              onClick={() => setNivelFiltro(nivel)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                nivelFiltro === nivel
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {nivel === 'todos'
                ? 'Todos'
                : nivel === 'error'
                  ? 'Erros'
                  : nivel === 'warn'
                    ? 'Avisos'
                    : nivel.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <TextField
            id="busca-logs"
            rotulo="Buscar"
            placeholder="Buscar por termo ou origem..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </Card>

      {/* Lista de Logs */}
      {logs.length === 0 ? (
        <EmptyState
          titulo="Nenhum log encontrado"
          descricao={
            busca
              ? 'Nenhum evento corresponde ao filtro informado.'
              : 'Não há eventos registrados no sistema até o momento.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-on-surface-variant">
            Exibindo {logs.length} registro(s) de log
          </div>

          {logs.map((item, idx) => {
            const idKey = item.id ?? idx
            const estaExpandido = itemExpandidoId === idKey
            const dataFmt = new Date(item.timestamp).toLocaleString('pt-BR')

            return (
              <Card
                key={idKey}
                className="glow-hover flex flex-col gap-2 p-4 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getVariantBadge(item.nivel)}>{item.nivel}</Badge>
                    <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-mono font-medium text-on-surface-variant">
                      [{item.origem}]
                    </span>
                    <span className="text-xs text-on-surface-variant">{dataFmt}</span>
                  </div>

                  {(item.detalhes || item.stack) && (
                    <button
                      onClick={() => setItemExpandidoId(estaExpandido ? null : idKey)}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      {estaExpandido ? 'Ocultar Detalhes ▲' : 'Ver Detalhes ▼'}
                    </button>
                  )}
                </div>

                <p className="text-sm font-medium text-on-surface">{item.mensagem}</p>

                {estaExpandido && (
                  <div className="mt-2 flex flex-col gap-2 rounded bg-surface-container-high p-3 font-mono text-xs">
                    {item.detalhes && (
                      <div>
                        <span className="font-semibold text-on-surface-variant">Detalhes Sanitizados:</span>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-on-surface">
                          {typeof item.detalhes === 'object'
                            ? JSON.stringify(item.detalhes, null, 2)
                            : String(item.detalhes)}
                        </pre>
                      </div>
                    )}

                    {item.stack && (
                      <div className="mt-2 border-t border-outline/20 pt-2 text-error">
                        <span className="font-semibold">Rastro da Exceção (Stack Trace):</span>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                          {item.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Confirmação para Limpar Logs */}
      <ConfirmModal
        aberto={modalLimparAberto}
        onCancelar={() => setModalLimparAberto(false)}
        onConfirmar={handleLimparLogs}
        titulo="Limpar Registros de Logs"
        descricao="Tem certeza de que deseja apagar todos os registros de log armazenados localmente? Esta ação não pode ser desfeita."
      />
    </div>
  )
}
