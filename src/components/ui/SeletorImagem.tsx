import React, { useRef, useState } from 'react'
import { Button } from './Button'

interface SeletorImagemProps {
  imagemUrl?: string
  onImagemSelecionada: (base64Url: string | undefined) => void
  label?: string
}

export function redimensionarECompressaoImagem(
  file: File,
  maxDimensao = 800,
  qualidade = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let largura = img.width
        let altura = img.height

        if (largura > maxDimensao || altura > maxDimensao) {
          if (largura > altura) {
            altura = Math.round((altura * maxDimensao) / largura)
            largura = maxDimensao
          } else {
            largura = Math.round((largura * maxDimensao) / altura)
            altura = maxDimensao
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = largura
        canvas.height = altura

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto do canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, largura, altura)
        const dataUrl = canvas.toDataURL('image/jpeg', qualidade)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Erro ao carregar a imagem'))
      img.src = e.target?.result as string
    }
    leitor.onerror = () => reject(new Error('Erro ao ler o arquivo'))
    leitor.readAsDataURL(file)
  })
}

export function SeletorImagem({
  imagemUrl,
  onImagemSelecionada,
  label = 'Imagem da Peça / Molde',
}: SeletorImagemProps) {
  const fileGaleriaRef = useRef<HTMLInputElement>(null)
  const fileCameraRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [modalCameraAberta, setModalCameraAberta] = useState(false)
  const [streamCamera, setStreamCamera] = useState<MediaStream | null>(null)
  const [erroCamera, setErroCamera] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function processarArquivo(file: File) {
    try {
      setCarregando(true)
      const compressedUrl = await redimensionarECompressaoImagem(file)
      onImagemSelecionada(compressedUrl)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar imagem.')
    } finally {
      setCarregando(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processarArquivo(file)
    }
    e.target.value = ''
  }

  async function abrirCameraAoVivo() {
    setErroCamera(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback para input camera do navegador/mobile
        fileCameraRef.current?.click()
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      setStreamCamera(stream)
      setModalCameraAberta(true)

      // Anexa stream ao elemento video quando o modal renderizar
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? 'Permissão da câmera foi negada. Por favor, habilite a permissão no navegador ou selecione uma foto da memória interna.'
          : 'Câmera ao vivo não disponível. Abrindo seletor de arquivos...'

      setErroCamera(errorMsg)
      // Fallback para o input file nativo de câmera
      setTimeout(() => {
        fileCameraRef.current?.click()
      }, 500)
    }
  }

  function fecharCamera() {
    if (streamCamera) {
      streamCamera.getTracks().forEach((track) => track.stop())
      setStreamCamera(null)
    }
    setModalCameraAberta(false)
  }

  function capturarFotoCanvas() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      onImagemSelecionada(dataUrl)
    }
    fecharCamera()
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">{label}</label>

      {/* Input nativo de arquivo para Galeria */}
      <input
        type="file"
        ref={fileGaleriaRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Input nativo com capture para Câmera Mobile */}
      <input
        type="file"
        ref={fileCameraRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {imagemUrl ? (
        <div className="relative inline-block border border-slate-700 rounded-xl overflow-hidden bg-slate-900/60 p-2 group">
          <img
            src={imagemUrl}
            alt="Preview"
            className="w-full h-40 object-cover rounded-lg shadow-md max-w-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variante="ghost"
              className="text-xs bg-slate-800 hover:bg-slate-700"
              onClick={() => fileGaleriaRef.current?.click()}
            >
              📁 Galeria
            </Button>
            <Button
              type="button"
              variante="ghost"
              className="text-xs bg-slate-800 hover:bg-slate-700"
              onClick={abrirCameraAoVivo}
            >
              📸 Tirar Foto
            </Button>
            <Button
              type="button"
              variante="ghost"
              className="text-xs text-error hover:bg-error/10"
              onClick={() => onImagemSelecionada(undefined)}
            >
              🗑️ Remover
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-700/80 rounded-xl p-4 text-center bg-slate-900/40 hover:border-violet-500/50 transition-colors">
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📷</span>
            <p className="text-xs text-slate-400">
              Adicione uma foto da peça ou do molde para catálogo e vitrine
            </p>

            {erroCamera && (
              <p className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40 max-w-sm">
                ⚠️ {erroCamera}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-2 mt-1">
              <Button
                type="button"
                variante="ghost"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                disabled={carregando}
                onClick={abrirCameraAoVivo}
              >
                📸 Tirar Foto (Câmera)
              </Button>
              <Button
                type="button"
                variante="ghost"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                disabled={carregando}
                onClick={() => fileGaleriaRef.current?.click()}
              >
                📁 Escolher da Memória / Galeria
              </Button>
            </div>
            {carregando && <p className="text-xs text-violet-400 animate-pulse">Processando imagem...</p>}
          </div>
        </div>
      )}

      {/* Modal da Câmera ao vivo */}
      {modalCameraAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-md w-full flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-full flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                📸 Capturar Foto com Câmera
              </h3>
              <button
                type="button"
                onClick={fecharCamera}
                className="text-slate-400 hover:text-white font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-slate-400 text-center">
              Posicione o item no centro e clique em &quot;Capturar Foto&quot;
            </p>

            <div className="flex gap-3 w-full justify-end">
              <Button type="button" variante="ghost" onClick={fecharCamera}>
                Cancelar
              </Button>
              <Button type="button" variante="primary" onClick={capturarFotoCanvas}>
                📷 Capturar Foto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
