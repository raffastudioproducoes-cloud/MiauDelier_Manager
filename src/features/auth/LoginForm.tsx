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
    : 'Acessar controle da MiauDelier'

  const rotuloBotaoPrincipal = !contaConfigurada
    ? 'Criar senha'
    : modoCadastro
    ? 'Cadastrar'
    : 'Entrar'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 md:p-10">
      <div className="glass-card flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-outline-variant/60 shadow-2xl md:flex-row">
        {/* Banner / Media Container (Esquerda no Desktop / Topo no Mobile) */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-surface-container via-surface-container-high to-surface p-6 sm:p-8 text-on-surface md:w-1/2 min-h-[240px] md:min-h-[540px]">
          {/* Efeitos de iluminação */}
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />

          {/* Conteúdo do Banner */}
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <img src={logoMiauDelier} alt="MiauDelier Logo" className="h-12 w-12 object-contain drop-shadow" />
              <div>
                <span className="text-lg font-bold tracking-tight text-on-surface">MiauDelier</span>
                <span className="block text-[10px] font-bold text-primary uppercase tracking-widest">Manager</span>
              </div>
            </div>

            {/* Container Reservado para Mídia (Imagem ou Vídeo) */}
            <div className="my-auto py-6 flex flex-col items-center justify-center text-center">
              <div className="w-full h-44 md:h-64 rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface/40 backdrop-blur flex flex-col items-center justify-center p-6 transition-all hover:border-primary/40 group">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                  🖼️
                </div>
                <p className="text-sm font-semibold text-on-surface">Espaço para Banner / Vídeo</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Área reservada para mídia promocional ou demonstração visual do ateliê
                </p>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant text-center md:text-left">
              © {new Date().getFullYear()} MiauDelier Manager — Sistema de Gestão para Ateliês.
            </p>
          </div>
        </div>

        {/* Formulário (Direita no Desktop / Embaixo no Mobile) */}
        <div className="flex flex-col justify-center p-6 sm:p-8 md:w-1/2 bg-surface/60 backdrop-blur-md">
          <div className="mx-auto w-full max-w-sm flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                {tituloFormulario} 👋
              </h1>
              <p className="mt-1.5 text-xs text-on-surface-variant">
                {subTituloFormulario}
              </p>
            </div>

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
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              <div className="relative">
                <TextField
                  id="senha"
                  rotulo="Senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  erro={erro ?? undefined}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-9 text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  {mostrarSenha ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>

              {modoCadastro && (
                <TextField
                  id="confirmar-senha"
                  rotulo="Confirmar senha"
                  type="password"
                  placeholder="••••••••"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              )}

              {!modoCadastro && contaConfigurada && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => alert('Para redefinir a senha, utilize o backup ou limpe a sessão.')}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <Button type="submit" disabled={enviando} className="w-full py-2.5 text-sm font-semibold glow-hover mt-1">
                {rotuloBotaoPrincipal}
              </Button>
            </form>

            {/* Social Logins */}
            {contaConfigurada && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-outline-variant/50" />
                  <span className="absolute bg-surface/90 px-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Ou continue com
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => alert('Login com Google em breve')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-4 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container transition-all cursor-pointer"
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
                    className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-4 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.81 1.44-.61.71-1.15 1.86-1 2.97 1.08.08 2.16-.57 2.82-1.37z"/>
                    </svg>
                    Apple
                  </button>
                </div>
              </div>
            )}

            {/* Alternar entre Login e Cadastro */}
            {contaConfigurada && (
              <div className="text-center pt-1">
                <p className="text-xs text-on-surface-variant">
                  {modoCadastro ? 'Já possui uma conta?' : 'Não tem uma conta?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModoCadastro(!modoCadastro)
                      setErro(null)
                    }}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {modoCadastro ? 'Entrar' : 'Cadastre-se'}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
