import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { exportarBackup, importarBackup } from '../../lib/backup'
import { ehBackupGestoraX, importarBackupGestoraX, type RelatorioImportacaoGestoraX } from '../../lib/gestoraxImport'

export function BackupPage() {
  const { mostrarToast } = useToast()
  const [erro, setErro] = useState<string | null>(null)
  const [conteudoSelecionado, setConteudoSelecionado] = useState<string | null>(null)
  const [ehGestoraX, setEhGestoraX] = useState(false)
  const [relatorioGestoraX, setRelatorioGestoraX] = useState<RelatorioImportacaoGestoraX | null>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  async function handleExportar() {
    try {
      const json = await exportarBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `miaudelier-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      mostrarToast('Backup exportado com sucesso')
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao exportar backup.', 'erro')
    }
  }

  async function handleSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    setErro(null)
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    const conteudo = await arquivo.text()
    if (!montado.current) return
    setConteudoSelecionado(conteudo)
    setEhGestoraX(ehBackupGestoraX(conteudo))
  }

  function limparSelecao() {
    setConteudoSelecionado(null)
    setEhGestoraX(false)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  async function handleConfirmarImportacao() {
    if (!conteudoSelecionado) return
    try {
      if (ehGestoraX) {
        const relatorio = await importarBackupGestoraX(conteudoSelecionado)
        if (!montado.current) return
        setRelatorioGestoraX(relatorio)
        mostrarToast('Dados do GestoraX importados e mesclados com sucesso')
        limparSelecao()
      } else {
        await importarBackup(conteudoSelecionado)
        mostrarToast('Backup importado. Faça login novamente.')
        limparSelecao()
      }
    } catch (falha) {
      if (!montado.current) return
      setErro(falha instanceof Error ? falha.message : 'Arquivo de backup inválido.')
      limparSelecao()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Backup</h1>
        <p className="text-label-sm text-on-surface-variant">Exportação e restauração dos dados do ateliê.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Exportar</h2>
        <Card>
          <p className="mb-3 text-sm text-on-surface-variant">
            Exporte seus dados para um arquivo local. Guarde esse arquivo em local seguro — é a única forma de recuperar seus dados se limpar o navegador.
          </p>
          <Button onClick={handleExportar}>Exportar backup</Button>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Importar</h2>
        <Card>
          <p className="mb-3 text-sm text-on-surface-variant">
            Importar um backup do MiauDelier substitui todos os dados atuais e encerra sua sessão. Um backup exportado do GestoraX é reconhecido automaticamente e, nesse caso, os dados são mesclados aos atuais sem apagar nada.
          </p>
          <label htmlFor="input-backup" className="text-sm font-medium text-on-surface">Importar backup</label>
          <input
            id="input-backup"
            ref={inputArquivoRef}
            type="file"
            accept="application/json"
            onChange={handleSelecionarArquivo}
            className="mt-1 block w-full text-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-on-primary file:cursor-pointer"
          />
          {erro && <p role="alert" className="mt-2 text-sm text-error">{erro}</p>}
        </Card>
      </section>

      {relatorioGestoraX && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Resultado da importação do GestoraX</h2>
          <Card>
            <ul className="flex flex-col gap-1 text-sm text-on-surface-variant">
              <li>Categorias: {relatorioGestoraX.categorias}</li>
              <li>Materiais: {relatorioGestoraX.materiais}</li>
              <li>Formas: {relatorioGestoraX.formas}</li>
              <li>Peças: {relatorioGestoraX.pecas}</li>
              <li>Consumos de material: {relatorioGestoraX.consumos}</li>
              <li>Eventos de produção: {relatorioGestoraX.eventos}</li>
              <li>Contas: {relatorioGestoraX.contas}</li>
              <li>Transações: {relatorioGestoraX.transacoes}</li>
            </ul>
            {relatorioGestoraX.ignorados.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-on-surface">Ignorados ({relatorioGestoraX.ignorados.length})</p>
                <ul className="mt-1 flex flex-col gap-1 text-xs text-on-surface-variant">
                  {relatorioGestoraX.ignorados.map((motivo, indice) => (
                    <li key={indice}>{motivo}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </section>
      )}

      <ConfirmModal
        aberto={conteudoSelecionado !== null}
        titulo={ehGestoraX ? 'Importar dados do GestoraX?' : 'Importar backup?'}
        descricao={
          ehGestoraX
            ? `Arquivo reconhecido como backup do GestoraX. Materiais, formas, peças, contas e transações serão mesclados aos dados atuais do MiauDelier (nada é apagado, e sua sessão continua aberta). Registros sem correspondência válida serão listados como ignorados.`
            : 'Importar este arquivo substitui todos os dados atuais e encerra sua sessão. Você precisará entrar de novo com a senha do backup. Essa ação não pode ser desfeita.'
        }
        onConfirmar={handleConfirmarImportacao}
        onCancelar={limparSelecao}
      />
    </div>
  )
}
