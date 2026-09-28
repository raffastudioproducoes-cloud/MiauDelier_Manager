import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import * as Dialog from '@radix-ui/react-dialog'
import { criarPerfil, selecionarPerfil, getDbNameForPerfil } from '../../lib/perfisRepo'
import { MiauDelierDB } from '../../db/schema'
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
      const parsed = JSON.parse(json)
      const checksumStr = parsed.checksum ? `-${parsed.checksum.substring(0, 8)}` : ''
      const dataHora = new Date().toISOString().replace(/[:.]/g, '-')

      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `miaudelier-backup-${dataHora}${checksumStr}.json`
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

  async function handleConfirmarImportacaoGestoraX() {
    if (!conteudoSelecionado || !ehGestoraX) return
    try {
      const relatorio = await importarBackupGestoraX(conteudoSelecionado)
      if (!montado.current) return
      setRelatorioGestoraX(relatorio)
      mostrarToast('Dados do GestoraX importados e mesclados com sucesso')
      limparSelecao()
    } catch (falha) {
      if (!montado.current) return
      const mensagem = falha instanceof Error ? falha.message : 'Arquivo de backup inválido.'
      logError('backup', `Erro ao importar arquivo JSON GestoraX: ${mensagem}`, falha)
      setErro(mensagem)
      limparSelecao()
    }
  }

  async function handleImportarNovoPerfil() {
    if (!conteudoSelecionado) return
    try {
      const novoPerfil = criarPerfil('Ateliê Restaurado')
      const dbName = getDbNameForPerfil(novoPerfil.id)
      const targetDb = new MiauDelierDB(dbName)
      
      await importarBackup(conteudoSelecionado, targetDb)
      targetDb.close()
      
      selecionarPerfil(novoPerfil.id)
      mostrarToast('Backup carregado no novo perfil! Entrando...', 'sucesso')
      setTimeout(() => window.location.reload(), 1500)
    } catch (falha) {
      if (!montado.current) return
      const mensagem = falha instanceof Error ? falha.message : 'Erro ao importar backup.'
      logError('backup', `Erro ao importar para novo perfil: ${mensagem}`, falha)
      setErro(mensagem)
      limparSelecao()
    }
  }

  async function handleImportarPerfilAtual() {
    if (!conteudoSelecionado) return
    try {
      await importarBackup(conteudoSelecionado)
      mostrarToast('Backup importado. Faça login novamente.', 'sucesso')
      limparSelecao()
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
        <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Gerenciar Dados</h2>
        <Card className="flex flex-col gap-6">
          
          <div className="flex flex-col gap-2 border-b border-outline-variant pb-6">
            <h3 className="text-sm font-medium text-on-surface">Exportar Backup</h3>
            <p className="text-sm text-on-surface-variant">
              Gera um arquivo JSON com todos os dados do seu ateliê. Guarde esse arquivo em um local seguro — ele é essencial para recuperar suas informações caso você limpe os dados do navegador ou deseje acessá-las em outro dispositivo.
            </p>
            <div className="mt-2">
              <Button onClick={handleExportar}>⬇️ Exportar backup</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-on-surface">Importar Backup</h3>
            <p className="text-sm text-on-surface-variant">
              Carrega os dados de um backup salvo anteriormente. Você poderá escolher entre substituir os dados do seu perfil atual ou criar um novo perfil para abrir o backup de forma segura. Também aceitamos arquivos exportados do GestoraX.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="input-backup"
                ref={inputArquivoRef}
                type="file"
                accept="application/json"
                onChange={handleSelecionarArquivo}
                className="hidden"
                data-testid="import-backup-input"
              />
              <Button type="button" onClick={() => inputArquivoRef.current?.click()}>
                📁 Selecionar Arquivo
              </Button>
            </div>
            {erro && <p role="alert" className="mt-2 text-sm text-error">{erro}</p>}
          </div>

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

      <Dialog.Root open={conteudoSelecionado !== null && !ehGestoraX} onOpenChange={(abertoAgora) => !abertoAgora && limparSelecao()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-outline-variant bg-surface-container p-6 shadow-lg">
            <Dialog.Title className="text-base font-semibold text-on-surface">Onde deseja carregar o backup?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-on-surface-variant">
              Você selecionou um backup válido do MiauDelier.
              <br /><br />
              <strong className="text-error">Atenção:</strong> Se você carregar no perfil atual, <strong>todas</strong> as informações atuais serão perdidas e substituídas pelo backup. Aconselhamos carregar este save em um novo perfil criado automaticamente.
            </Dialog.Description>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={handleImportarNovoPerfil} className="w-full flex justify-center">
                ✨ Carregar em NOVO Perfil
              </Button>
              <Button onClick={handleImportarPerfilAtual} variante="ghost" className="w-full flex justify-center border border-error/50 text-error hover:bg-error/10">
                ⚠️ Substituir Perfil Atual
              </Button>
              <Button onClick={limparSelecao} variante="ghost" className="w-full flex justify-center mt-2">
                Cancelar
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmModal
        aberto={conteudoSelecionado !== null && ehGestoraX}
        titulo="Importar dados do GestoraX?"
        descricao="Arquivo reconhecido como backup do GestoraX. Materiais, formas, peças, contas e transações serão mesclados aos dados atuais do MiauDelier (nada é apagado, e sua sessão continua aberta). Registros sem correspondência válida serão listados como ignorados."
        onConfirmar={handleConfirmarImportacaoGestoraX}
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

