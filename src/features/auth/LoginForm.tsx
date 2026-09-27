import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import logoMiauDelier from '../../assets/logo-miaudelier.png'

export function LoginForm() {
  const navigate = useNavigate()
  const contaConfigurada = useAuthStore((estado) => estado.contaConfigurada)
  const carregarEstadoInicial = useAuthStore((estado) => estado.carregarEstadoInicial)
  const entrar = useAuthStore((estado) => estado.entrar)
  const criarConta = useAuthStore((estado) => estado.criarConta)

  const [modoCadastro, setModoCadastro] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const autenticado = useAuthStore((estado) => estado.autenticado)

  useEffect(() => {
    carregarEstadoInicial()
  }, [carregarEstadoInicial])

  useEffect(() => {
    if (autenticado) {
      navigate({ to: '/' })
    }
  }, [autenticado, navigate])

  if (contaConfigurada === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-on-surface-variant">
        <p>Carregando...</p>
      </div>
    )
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)

    if (modoCadastro && senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      setEnviando(false)
      return
    }

    try {
      if (contaConfigurada) {
        if (modoCadastro) {
          await criarConta(senha)
        } else {
          const sucesso = await entrar(senha)
          if (!sucesso) {
            setErro('Senha incorreta.')
            return
          }
        }
      } else {
        await criarConta(senha)
      }
      navigate({ to: '/' })
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha inesperada.')
    } finally {
      setEnviando(false)
    }
  }

  const tituloFormulario = !contaConfigurada
    ? 'Criar senha'
    : modoCadastro
    ? 'Criar conta'
    : 'Entrar'

  const subTituloFormulario = !contaConfigurada
    ? 'Defina a senha que vai proteger seus dados.'
    : modoCadastro
    ? 'Cadastre seu ateliê para controlar sua produção.'
    : 'Entre para continuar'

  const rotuloBotaoPrincipal = !contaConfigurada
    ? 'Criar senha'
    : modoCadastro
    ? 'Cadastrar'
    : 'Entrar'

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background flex flex-col md:flex-row">
      {/* Efeitos de Iluminação de Fundo */}
      <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-surface-container-high/40 blur-[150px] pointer-events-none" />

      {/* LADO ESQUERDO — Mídia / Ilustração Destaque (Desktop: ~58% da tela, Mobile: Topo) */}
      <div className="relative flex flex-col justify-between p-8 sm:p-12 md:w-[58%] lg:w-[62%] min-h-[320px] md:min-h-screen z-10">
        {/* Marca MiauDelier */}
        <div className="flex items-center gap-3">
          <img src={logoMiauDelier} alt="MiauDelier Logo" className="h-12 w-12 object-contain drop-shadow-md" />
          <div>
            <span className="text-xl font-bold tracking-tight text-on-surface">MiauDelier</span>
            <span className="block text-[10px] font-bold text-primary uppercase tracking-widest">Manager</span>
          </div>
        </div>

        {/* Slot de Mídia Ilustrativa (Container de destaque preparado para Imagem ou Vídeo) */}
        <div className="my-auto py-8 flex flex-col items-center justify-center text-center">
          <div className="relative w-full max-w-lg h-60 md:h-80 rounded-3xl border-2 border-dashed border-outline-variant/50 bg-surface-container/20 backdrop-blur-md flex flex-col items-center justify-center p-8 transition-all hover:border-primary/40 group shadow-inner">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <p className="text-base font-bold text-on-surface">Espaço para Imagem / Vídeo</p>
            <p className="text-xs text-on-surface-variant mt-1.5 max-w-sm leading-relaxed">
              Área reservada para demonstração visual do ateliê ou mídia institucional.
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-xs text-on-surface-variant/80">
          © {new Date().getFullYear()} MiauDelier Manager — Sistema de Gestão para Ateliês.
        </p>
      </div>

      {/* GRADIENTE DE TRANSIÇÃO SUAVE ENTRE ESQUERDA E DIREITA */}
      <div className="hidden md:block absolute left-[50%] top-0 bottom-0 w-[20%] bg-gradient-to-r from-transparent via-background/60 to-background pointer-events-none z-10" />

      {/* LADO DIREITO — Formulário de Autenticação Seamless (Desktop: ~42% da tela, Mobile: Abaixo) */}
      <div className="relative z-20 flex flex-col justify-center p-6 sm:p-10 md:p-16 md:w-[42%] lg:w-[38%] min-h-[500px] md:min-h-screen bg-background/80 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
        <div className="w-full max-w-md mx-auto flex flex-col gap-6">
          {/* Cabeçalho do Formulário */}
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
              {tituloFormulario} 👋
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              {subTituloFormulario}
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {modoCadastro && (
              <TextField
                id="nome"
                rotulo="Nome completo"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            )}

            {(modoCadastro || contaConfigurada) && (
              <TextField
                id="email"
                rotulo="E-mail / Usuário"
                type="email"
                placeholder="Digite seu usuário ou e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <div className="relative">
              <TextField
                id="senha"
                rotulo="Senha"
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                erro={erro ?? undefined}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-9 text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                {mostrarSenha ? '🙈 Ocultar' : '👁️ Mostrar'}
              </button>
            </div>

            {modoCadastro && (
              <TextField
                id="confirmar-senha"
                rotulo="Confirmar senha"
                type="password"
                placeholder="Confirme sua senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            )}

            <Button
              type="submit"
              disabled={enviando}
              className="w-full py-3 text-sm font-bold glow-hover mt-2 rounded-xl"
            >
              {rotuloBotaoPrincipal}
            </Button>
          </form>

          {/* Links Secundários (Esqueceu a senha / Criar conta) */}
          {contaConfigurada && (
            <div className="flex items-center justify-center gap-3 text-xs text-on-surface-variant pt-1">
              {!modoCadastro && (
                <>
                  <button
                    type="button"
                    onClick={() => alert('Para redefinir a senha, utilize o backup ou limpe a sessão.')}
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                  <span>·</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setModoCadastro(!modoCadastro)
                  setErro(null)
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                {modoCadastro ? 'Já tem uma conta? Entrar' : 'Criar conta'}
              </button>
            </div>
          )}

          {/* Social Logins */}
          {contaConfigurada && (
            <div className="flex flex-col gap-4 pt-4">
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-outline-variant/40" />
                <span className="absolute bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Ou continue com
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('Login com Google em breve')}
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container/70 transition-all cursor-pointer shadow-sm"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => alert('Login com Apple em breve')}
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container/70 transition-all cursor-pointer shadow-sm"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.81 1.44-.61.71-1.15 1.86-1 2.97 1.08.08 2.16-.57 2.82-1.37z"/>
                  </svg>
                  Apple
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
