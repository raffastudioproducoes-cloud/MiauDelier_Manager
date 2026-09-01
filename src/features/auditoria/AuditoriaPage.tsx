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
  if (registro.valorAnterior === undefined && registro.valorNovo === undefined) {
    return 'Exclusão'
  }
  return `Alteração: ${registro.valorAnterior ?? '—'} → ${registro.valorNovo ?? '—'}`
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Auditoria</h1>
        <p className="text-label-sm text-on-surface-variant">
          Registro de ações sensíveis: exclusões e mudanças de preço/venda.
        </p>
      </div>

      {registros.length === 0 ? (
        <EmptyState titulo="Nenhum registro de auditoria" descricao="Ações sensíveis aparecerão aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {registros.map((registro) => (
            <Card key={registro.id} className="glow-hover">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium capitalize text-on-surface">
                  {registro.entidade} #{registro.entidadeId}
                </h3>
                <p className="text-label-sm text-on-surface-variant">{formatarQuando(registro.quando)}</p>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">{descricaoAcao(registro)}</p>
              <p className="mt-1 text-label-sm text-on-surface-variant">Por: {registro.quem}</p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
