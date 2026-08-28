import { useRef, useState } from 'react'
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

  async function handleExportar() {
    try {
      const json = await exportarBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `miaudelier-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
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
      setErro(falha instanceof Error ? falha.message : 'Arquivo de backup inválido.')
    } finally {
      limparSelecao()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Backup</h1>

      <Card>
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">
          Exporte seus dados para um arquivo local. Guarde esse arquivo em local seguro — é a única forma de recuperar seus dados se limpar o navegador.
        </p>
        <Button onClick={handleExportar}>Exportar backup</Button>
      </Card>

      <Card>
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">
          Importar um backup substitui todos os dados atuais e encerra sua sessão — você precisará entrar de novo com a senha do backup.
        </p>
        <label htmlFor="input-backup" className="text-sm font-medium">Importar backup</label>
        <input
          id="input-backup"
          ref={inputArquivoRef}
          type="file"
          accept="application/json"
          onChange={handleSelecionarArquivo}
          className="mt-1"
        />
        {erro && <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{erro}</p>}
      </Card>

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
