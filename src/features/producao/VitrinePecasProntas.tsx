import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { SeletorImagem } from '../../components/ui/SeletorImagem'
import { atualizarPrecoVendaPeca, atualizarImagemPeca, type PecaComForma } from './pecasRepo'
import { obterWhatsappLoja, salvarWhatsappLoja } from './lojaConfigRepo'

interface VitrinePecasProntasProps {
  pecas: PecaComForma[]
  onRecarregar: () => void
}

export function VitrinePecasProntas({ pecas, onRecarregar }: VitrinePecasProntasProps) {
  const { mostrarToast } = useToast()
  const [whatsappDono, setWhatsappDono] = useState('')
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false)
  const [editandoImagemId, setEditandoImagemId] = useState<number | null>(null)
  const [editandoPrecoId, setEditandoPrecoId] = useState<number | null>(null)
  const [novoPrecoInput, setNovoPrecoInput] = useState('')

  // Filtra apenas peças prontas
  const pecasProntas = pecas.filter((p) => p.status === 'pronta')

  useEffect(() => {
    obterWhatsappLoja().then((tel) => setWhatsappDono(tel))
  }, [])

  async function handleSalvarWhatsapp() {
    setSalvandoWhatsapp(true)
    try {
      // Remove caracteres não numéricos
      const limpo = whatsappDono.replace(/\D/g, '')
      await salvarWhatsappLoja(limpo)
      setWhatsappDono(limpo)
      mostrarToast('Número do WhatsApp salvo com sucesso!', 'sucesso')
    } catch {
      mostrarToast('Erro ao salvar WhatsApp.', 'erro')
    } finally {
      setSalvandoWhatsapp(false)
    }
  }

  function gerarTextoPost(peca: PecaComForma): { textoPost: string; linkWhatsapp: string } {
    const precoFmt = peca.precoVenda !== undefined ? `R$ ${peca.precoVenda.toFixed(2)}` : 'Consulte valor'
    const tel = whatsappDono.replace(/\D/g, '')

    const mensagemInteresse = `Olá! Vi a peça "${peca.nome}" (${peca.numeroSerie ?? ''}) na vitrine MiauDelier e gostaria de adquirir! Valor: ${precoFmt}.`
    const linkWhatsapp = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(mensagemInteresse)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagemInteresse)}`

    const textoPost = `🛍️ *${peca.nome}* (${peca.numeroSerie ?? ''})\n✨ Peça exclusiva pronta entrega!\n\n🏷️ Valor: ${precoFmt}\n📐 Molde: ${peca.nomeForma}\n\n📲 Garantir esta peça pelo WhatsApp:\n${linkWhatsapp}`

    return { textoPost, linkWhatsapp }
  }

  async function handleCopiarPost(peca: PecaComForma) {
    const { textoPost } = gerarTextoPost(peca)
    try {
      await navigator.clipboard.writeText(textoPost)
      mostrarToast('Texto do post copiado para a área de transferência!', 'sucesso')
    } catch {
      mostrarToast('Não foi possível copiar o texto.', 'erro')
    }
  }

  async function handleCompartilharNativo(peca: PecaComForma) {
    const { textoPost, linkWhatsapp } = gerarTextoPost(peca)
    if (navigator.share) {
      try {
        await navigator.share({
          title: peca.nome,
          text: textoPost,
          url: linkWhatsapp,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          mostrarToast('Erro ao compartilhar.', 'erro')
        }
      }
    } else {
      handleCopiarPost(peca)
    }
  }

  async function handleSalvarNovoPreco(pecaId: number) {
    const valor = Number(novoPrecoInput)
    if (isNaN(valor) || valor <= 0) {
      mostrarToast('Informe um valor de venda válido.', 'erro')
      return
    }
    try {
      await atualizarPrecoVendaPeca(pecaId, valor)
      setEditandoPrecoId(null)
      setNovoPrecoInput('')
      onRecarregar()
      mostrarToast('Preço de venda atualizado!', 'sucesso')
    } catch {
      mostrarToast('Erro ao atualizar preço.', 'erro')
    }
  }

  async function handleSalvarImagem(pecaId: number, novaUrl?: string) {
    try {
      await atualizarImagemPeca(pecaId, novaUrl)
      setEditandoImagemId(null)
      onRecarregar()
      mostrarToast('Imagem da peça atualizada!', 'sucesso')
    } catch {
      mostrarToast('Erro ao atualizar imagem.', 'erro')
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner / Configuração do WhatsApp do Dono */}
      <Card className="bg-gradient-to-r from-violet-950/40 via-slate-900 to-slate-900 border-violet-800/40 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>🛍️</span> Vitrine de Peças Prontas & Posts para Redes Sociais
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Aqui ficam agrupadas todas as suas peças finalizadas e não vendidas. Você pode gerar posts com texto pré-formatado e botão de compra direta para o seu WhatsApp!
            </p>
          </div>

          <div className="w-full sm:w-auto flex items-end gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/70">
            <TextField
              id="whatsapp-dono-input"
              rotulo="Seu WhatsApp (DDD + número)"
              placeholder="Ex: 5521999998888"
              value={whatsappDono}
              onChange={(e) => setWhatsappDono(e.target.value)}
              className="w-48 text-xs"
            />
            <Button
              type="button"
              variante="primary"
              disabled={salvandoWhatsapp}
              onClick={handleSalvarWhatsapp}
            >
              💾 Salvar
            </Button>
          </div>
        </div>
      </Card>

      {/* Galeria de Posts da Vitrine */}
      {pecasProntas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma peça pronta na vitrine"
          descricao="Assim que uma peça atingir o status 'pronta' e ainda não tiver sido vendida, ela aparecerá aqui para você divulgar e compartilhar."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pecasProntas.map((peca) => {
            const { textoPost, linkWhatsapp } = gerarTextoPost(peca)
            const estaEditandoImagem = editandoImagemId === peca.id
            const estaEditandoPreco = editandoPrecoId === peca.id

            return (
              <Card
                key={peca.id}
                className="glow-hover flex flex-col justify-between overflow-hidden bg-slate-900/90 border-slate-800 hover:border-violet-500/40 transition-all p-0"
              >
                {/* Cabeçalho da Imagem do Post */}
                <div className="relative aspect-video sm:aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden group">
                  {peca.imagemUrl ? (
                    <img
                      src={peca.imagemUrl}
                      alt={peca.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500 p-6 text-center">
                      <span className="text-4xl">✨</span>
                      <span className="text-xs">Sem foto cadastrada</span>
                    </div>
                  )}

                  {/* Badge de Preço em Destaque */}
                  <div className="absolute top-3 right-3 bg-violet-600/95 text-white font-bold text-sm px-3 py-1 rounded-full shadow-lg border border-violet-400/30 backdrop-blur-sm">
                    {peca.precoVenda !== undefined ? `R$ ${peca.precoVenda.toFixed(2)}` : 'Preço pendente'}
                  </div>

                  <div className="absolute top-3 left-3">
                    <Badge variant="success">🛍️ Pronta Entrega</Badge>
                  </div>

                  {/* Botão para Alterar Imagem */}
                  <button
                    type="button"
                    onClick={() => setEditandoImagemId(estaEditandoImagem ? null : (peca.id ?? null))}
                    className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-sm flex items-center gap-1.5 shadow-md"
                  >
                    📸 {peca.imagemUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                  </button>
                </div>

                {/* Form de Edição de Imagem em Modal Popover */}
                {estaEditandoImagem && (
                  <div className="p-4 bg-slate-950 border-b border-slate-800">
                    <SeletorImagem
                      imagemUrl={peca.imagemUrl}
                      onImagemSelecionada={(novaUrl) => peca.id !== undefined && handleSalvarImagem(peca.id, novaUrl)}
                      label="Capturar ou Selecionar Nova Foto"
                    />
                    <div className="mt-2 text-right">
                      <Button
                        type="button"
                        variante="ghost"
                        onClick={() => setEditandoImagemId(null)}
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Corpo do Card */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-lg text-white leading-snug">{peca.nome}</h3>
                      <span className="text-xs text-slate-400 font-mono shrink-0">
                        {peca.numeroSerie}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Molde: <strong>{peca.nomeForma}</strong>
                    </p>
                  </div>

                  {/* Edição de Preço */}
                  {estaEditandoPreco ? (
                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <TextField
                        id={`preco-input-${peca.id}`}
                        rotulo="Novo Preço (R$)"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={novoPrecoInput}
                        onChange={(e) => setNovoPrecoInput(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variante="primary"
                        onClick={() => peca.id !== undefined && handleSalvarNovoPreco(peca.id)}
                      >
                        Salvar
                      </Button>
                      <Button
                        type="button"
                        variante="ghost"
                        onClick={() => setEditandoPrecoId(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-2">
                      <span className="text-slate-400">Preço de Venda Sugerido:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoPrecoId(peca.id ?? null)
                          setNovoPrecoInput(peca.precoVenda ? String(peca.precoVenda) : '')
                        }}
                        className="text-violet-400 hover:text-violet-300 font-semibold underline flex items-center gap-1"
                      >
                        ✏️ {peca.precoVenda !== undefined ? `R$ ${peca.precoVenda.toFixed(2)}` : 'Definir Preço'}
                      </button>
                    </div>
                  )}

                  {/* Prévia do Texto do Post */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {textoPost}
                  </div>

                  {/* Botões de Ação de Compartilhamento */}
                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={linkWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
                    >
                      <span>💬</span> Compartilhar no WhatsApp
                    </a>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variante="ghost"
                        className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 text-white"
                        onClick={() => handleCopiarPost(peca)}
                      >
                        📋 Copiar Texto
                      </Button>

                      <Button
                        type="button"
                        variante="ghost"
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                        onClick={() => handleCompartilharNativo(peca)}
                      >
                        🔗 Compartilhar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
