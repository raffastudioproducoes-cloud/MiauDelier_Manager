import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { exportarBackup, importarBackup, zerarDadosManterPerfil } from '../../lib/backup'
import { ehBackupGestoraX, importarBackupGestoraX, type RelatorioImportacaoGestoraX } from '../../lib/gestoraxImport'
import { logError } from '../../lib/logger'

export function BackupPage() {
  const { mostrarToast } = useToast()
  const [erro, setErro] = useState<string | null>(null)
  const [conteudoSelecionado, setConteudoSelecionado] = useState<string | null>(null)
  const [ehGestoraX, setEhGestoraX] = useState(false)
  const [relatorioGestoraX, setRelatorioGestoraX] = useState<RelatorioImportacaoGestoraX | null>(null)
  const [confirmandoZerar, setConfirmandoZerar] = useState(false)
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
      logError('backup', 'Erro ao exportar backup na interface', falha)
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao exportar backup.', 'erro')
    }
  }

  async function handleSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    setErro(null)
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    try {
      const conteudo = await arquivo.text()
      if (!montado.current) return
      setConteudoSelecionado(conteudo)
      setEhGestoraX(ehBackupGestoraX(conteudo))
    } catch (falha) {
      logError('backup', 'Erro ao carregar o conteúdo do arquivo selecionado', {
        nome: arquivo.name,
        tamanho: arquivo.size,
        tipo: arquivo.type,
        falha,
      })
      setErro('Erro ao ler o arquivo selecionado.')
    }
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
      const mensagem = falha instanceof Error ? falha.message : 'Arquivo de backup inválido.'
      logError('backup', `Erro ao importar arquivo JSON: ${mensagem}`, falha)
      setErro(mensagem)
      limparSelecao()
    }
  }

  async function handleConfirmarZerar() {
    try {
      await zerarDadosManterPerfil()
      if (!montado.current) return
      mostrarToast('Todos os dados do ateliê foram zerados com sucesso. Os dados do seu perfil foram mantidos.', 'sucesso')
      setConfirmandoZerar(false)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao apagar dados do ateliê.', 'erro')
      setConfirmandoZerar(false)
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

      <section>
        <h2 className="mb-2 text-sm font-semibold text-error">Apagar Dados do Ateliê</h2>
        <Card className="border border-error/30 bg-error/5">
          <p className="mb-3 text-sm text-on-surface-variant">
            Zera todos os dados cadastrados (materiais, formas, peças, vendas, clientes, contas e transações), deixando apenas as informações do seu <strong>Perfil do Ateliê</strong> e sua senha de acesso intactos.
          </p>
          <Button
            type="button"
            variante="ghost"
            className="border border-error/50 text-error hover:bg-error/10 font-medium"
            onClick={() => setConfirmandoZerar(true)}
          >
            🗑️ Apagar dados (Manter perfil)
          </Button>
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
              {relatorioGestoraX.equipamentos > 0 && <li>Equipamentos: {relatorioGestoraX.equipamentos}</li>}
              {relatorioGestoraX.taxas > 0 && <li>Taxas: {relatorioGestoraX.taxas}</li>}
              <li>Peças: {relatorioGestoraX.pecas}</li>
              <li>Consumos de material: {relatorioGestoraX.consumos}</li>
              <li>Eventos de produção: {relatorioGestoraX.eventos}</li>
              <li>Contas: {relatorioGestoraX.contas}</li>
              <li>Transações: {relatorioGestoraX.transacoes}</li>
              {relatorioGestoraX.notificacoes > 0 && <li>Notificações: {relatorioGestoraX.notificacoes}</li>}
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

      <ConfirmModal
        aberto={confirmandoZerar}
        titulo="Apagar todos os dados do ateliê?"
        descricao="Esta ação irá excluir permanentemente todos os materiais, formas, peças, clientes, pedidos e histórico financeiro. Os dados do seu perfil e seu login serão mantidos intactos. Esta ação NÃO pode ser desfeita. Deseja continuar?"
        onConfirmar={handleConfirmarZerar}
        onCancelar={() => setConfirmandoZerar(false)}
      />
    </div>
  )
}

