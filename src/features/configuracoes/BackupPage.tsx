import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { exportarBackup, importarBackup } from '../../lib/backup'

export function BackupPage() {
  const { mostrarToast } = useToast()
  const [erro, setErro] = useState<string | null>(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
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

  function handleSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    setErro(null)
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    setArquivoSelecionado(arquivo)
  }

  function limparSelecao() {
    setArquivoSelecionado(null)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  async function handleConfirmarImportacao() {
    if (!arquivoSelecionado) return
    try {
      const conteudo = await arquivoSelecionado.text()
      await importarBackup(conteudo)
      mostrarToast('Backup importado. Faça login novamente.')
    } catch (falha) {
      if (!montado.current) return
      setErro(falha instanceof Error ? falha.message : 'Arquivo de backup inválido.')
    } finally {
      if (montado.current) limparSelecao()
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
            Importar um backup substitui todos os dados atuais e encerra sua sessão — você precisará entrar de novo com a senha do backup.
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

      <ConfirmModal
        aberto={arquivoSelecionado !== null}
        titulo="Importar backup?"
        descricao="Importar este arquivo substitui todos os dados atuais e encerra sua sessão. Você precisará entrar de novo com a senha do backup. Essa ação não pode ser desfeita."
        onConfirmar={handleConfirmarImportacao}
        onCancelar={limparSelecao}
      />
    </div>
  )
}
