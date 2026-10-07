import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import logoMiauDelier from '../../assets/logo-miaudelier.png'
import catFeederBanner from '../../assets/cats-feeder-login.jpg'

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
  const [mostrarOverlay, setMostrarOverlay] = useState(false)
  const [textoOverlay, setTextoOverlay] = useState('Verificando dados...')

  const autenticado = useAuthStore((estado) => estado.autenticado)

  useEffect(() => {
    carregarEstadoInicial()
  }, [carregarEstadoInicial])

  useEffect(() => {
    if (autenticado) {
      if (contaConfigurada) {
        navigate({ to: '/' })
      } else {
        // Autenticado via link de confirmação, mas sem cofre local.
        // Precisamos que o usuário faça o login manualmente para capturar a senha e criar/recuperar o cofre.
        supabase.auth.signOut().then(() => {
          setErro('E-mail confirmado com sucesso! Por favor, faça o login com sua senha para acessar seu ateliê.')
          setModoCadastro(false)
        })
      }
    }
  }, [autenticado, contaConfigurada, navigate])

  // Removido o useEffect que mudava para modoCadastro(true) automaticamente.
  // Assim a página de login sempre carrega no formulário de logar.

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
      setMostrarOverlay(true)
      setTextoOverlay(modoCadastro ? 'Criando conta e ateliê...' : 'Verificando dados e sincronizando...')
      if (contaConfigurada) {
        if (modoCadastro) {
          setErro('Já existe uma conta neste dispositivo. Acesse a aba "Entrar" para fazer login.')
          setEnviando(false)
          setMostrarOverlay(false)
          return
        } else {
          // PASSO 1: Entrar no cofre local (valida a senha com 100% de certeza)
          const sucesso = await entrar(senha)
          if (!sucesso) {
            setErro('Senha incorreta.')
            setEnviando(false)
            setMostrarOverlay(false)
            return
          }

          // PASSO 2: Agora tentamos logar ou criar na nuvem para manter a sincronia
          if (email) {
            const { error: supaErr } = await supabase.auth.signInWithPassword({ email, password: senha })
            if (supaErr) {
              setErro(supaErr.message.toLowerCase().includes('email not confirmed')
                ? 'Por favor, confirme sua conta pelo e-mail antes de fazer login.'
                : 'Conta não encontrada ou senha incorreta. Use “Criar Conta” para se cadastrar.')
              setEnviando(false)
              setMostrarOverlay(false)
              return
            }
            const { syncOnLogin } = await import('../../lib/syncService')
            await syncOnLogin().catch(console.warn)
          }

        }
      } else {
        if (!modoCadastro) {
          // Novo dispositivo: tenta login na nuvem e puxa o cofre
          if (!email) {
            setErro('Por favor, informe seu e-mail para buscar sua conta.')
            setEnviando(false)
            setMostrarOverlay(false)
            return
          }
          const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
          if (error) {
            if (error.message.toLowerCase().includes('email not confirmed')) {
              setErro('Por favor, verifique sua caixa de e-mail e confirme sua conta antes de fazer o login.')
            } else {
              setErro('Conta não encontrada ou senha incorreta. Use “Criar Conta” para se cadastrar.')
            }
            setEnviando(false)
            setMostrarOverlay(false)
            return
          }
          // O Supabase autentica o usuário; o dispositivo apenas inicializa o banco local.
          await criarConta(senha)
        } else {
          // Cria a conta na nuvem e o cofre local
          if (email) {
            const { data, error } = await supabase.auth.signUp({
              email,
              password: senha,
              options: { data: { full_name: nome } }
            })
            
            if (error) {
              const isDuplicated = error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('já cadastrado')
              if (isDuplicated) {
                setErro('Este e-mail já possui cadastro. Redirecionando para o login...')
                setTimeout(() => {
                  setErro('')
                  setModoCadastro(false)
                }, 2500)
              } else {
                setErro(error.message)
              }
              setEnviando(false)
              setMostrarOverlay(false)
              return
            }
            
            if (data?.user?.identities && data.user.identities.length === 0) {
              setErro('Este e-mail já possui cadastro. Redirecionando para o login...')
              setTimeout(() => {
                setErro('')
                setModoCadastro(false)
              }, 2500)
              setEnviando(false)
              setMostrarOverlay(false)
              return
            }
            
            if (!data?.session) {
              setErro('Cadastro iniciado. Confirme seu e-mail em até 24 horas e depois faça login.')
              setModoCadastro(false)
              setMostrarOverlay(false)
              setEnviando(false)
              return
            }
          }
          await criarConta(senha)

          try {
            const { data: { user } } = await supabase.auth.getUser()
            const fullName = user?.user_metadata?.full_name

            const { atualizarPerfil, getPerfilAtivo } = await import('../../lib/perfisRepo')
            const ativo = await getPerfilAtivo()
            
            await atualizarPerfil(ativo.id, { 
              nomeDono: fullName || nome || '',
              nome: fullName ? `Ateliê de ${fullName}` : (nome ? `Ateliê de ${nome}` : 'Ateliê Principal'),
              emailDono: email
            })
          } catch (e) {
            console.warn('Erro ao atualizar nome do perfil (cadastro):', e)
          }
        }
      }
      
      setTextoOverlay('Concluído!')
      await new Promise(r => setTimeout(r, 800))
      
      navigate({ to: '/' })
    } catch (falha) {
      setMostrarOverlay(false)
      setEnviando(false)
      let msg = falha instanceof Error ? falha.message : 'Falha inesperada.'
      if (msg === 'Failed to fetch') {
        const urlStatus = import.meta.env.VITE_SUPABASE_URL ? 'OK' : 'Ausente (cache antigo)';
        msg = `Erro de conexão (Failed to fetch). URL Configurada: ${urlStatus}. Seu navegador pode estar usando uma versão antiga salva no cache. Por favor, feche e abra o app novamente, ou limpe o cache do navegador (CTRL + F5).`
      }
      setErro(msg)
    } finally {
      // Deixado intencionalmente vazio, pois limpamos enviando nos retornos de erro ou antes do navigate
    }
  }

  const tituloFormulario = modoCadastro
    ? 'Criar conta'
    : 'Entrar'

  const subTituloFormulario = modoCadastro
    ? 'Cadastre seu ateliê para controlar sua produção.'
    : 'Entre para continuar'

  const rotuloBotaoPrincipal = modoCadastro
    ? 'Cadastrar'
    : 'Entrar'

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-on-surface flex flex-col md:flex-row font-sans">
      
      {/* OVERLAY DE LOADING */}
      {mostrarOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center gap-4 p-8 bg-surface-container rounded-3xl shadow-2xl border border-outline-variant/30 animate-in fade-in zoom-in-95">
            {textoOverlay === 'Concluído!' ? (
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary text-2xl">
                ✓
              </div>
            ) : (
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            <p className="text-on-surface font-bold tracking-tight text-lg animate-pulse">{textoOverlay}</p>
          </div>
        </div>
      )}

      {/* Luzes de Iluminação de Fundo de Suporte (Theme Ambient Glow) */}
      <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-surface-container-high/30 blur-[160px] pointer-events-none" />

      {/* LADO ESQUERDO — Imagem Hero dos Gatos MiauDelier (Desktop: ~50-52% da tela, Mobile: Banner Topo) */}
      <div className="relative w-full md:w-[52%] lg:w-[55%] min-h-[340px] sm:min-h-[420px] md:min-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-10 z-10">
        {/* Imagem de Fundo Completa sem Caixas ou Molduras */}
        <img
          src={catFeederBanner}
          alt="Comedor de Gatos MiauDelier"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out hover:scale-105"
        />

        {/* Camada Escura Leve para Leitura de Texto/Logos */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {/* MÁSCARA EM DEGRADÊ CRUZADO DA IMAGEM DA ESQUERDA PARA A DIREITA (Mesclagem na metade da tela) */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent md:bg-gradient-to-r md:from-transparent md:via-background/50 md:to-background pointer-events-none" />

        {/* Marca MiauDelier no Canto Superior Esquerdo com Logo Ampliada */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5 backdrop-blur-md bg-background/70 p-3 px-5 sm:px-6 rounded-3xl border border-outline-variant/40 shadow-2xl">
            <img src={logoMiauDelier} alt="MiauDelier Logo" className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow-md" />
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-on-surface block leading-tight">MiauDelier</span>
              <span className="block text-xs font-extrabold text-primary uppercase tracking-widest mt-0.5">Manager</span>
            </div>
          </div>
        </div>

        {/* Rodapé com Direitos no Canto Inferior Esquerdo */}
        <div className="relative z-20 hidden sm:block">
          <p className="text-xs font-medium text-on-surface/90 backdrop-blur-md bg-background/40 px-3.5 py-2 rounded-xl border border-outline-variant/20 inline-block">
            © {new Date().getFullYear()} MiauDelier Manager — Sistema de Gestão para Ateliês.
          </p>
        </div>
      </div>

      {/* GRADIENTE DE INTERSEÇÃO/TRANSIÇÃO CRUZADA CENTRALIZADO NA METADE DA TELA (~50%) */}
      <div className="hidden md:block absolute left-[35%] lg:left-[40%] right-[30%] lg:right-[35%] top-0 bottom-0 pointer-events-none z-20 bg-gradient-to-r from-transparent via-background/80 to-background" />

      {/* LADO DIREITO — Formulário de Autenticação Posicionado Mais À Esquerda (Desktop: ~48-50%) */}
      <div className="relative z-30 flex-1 flex flex-col justify-center p-6 sm:p-10 md:p-12 lg:p-16 min-h-[480px] md:min-h-screen bg-background md:bg-transparent">
        {/* Fundo Colorido do Tema com Degradê da Direita para a Esquerda para Fazer a Junção Sem Linha Dura */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-l from-background via-background/95 to-transparent pointer-events-none -z-10" />

        <div className="w-full max-w-xs sm:max-w-sm mx-auto md:ml-6 lg:ml-10 flex flex-col gap-5">
          {/* Alternador Entrar / Cadastrar (Tabs Suaves e Compactas) */}
          <div className="flex rounded-xl bg-surface-container-high/40 p-1 border border-outline-variant/30">
            <button
              type="button"
              onClick={() => {
                setModoCadastro(false)
                setErro(null)
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !modoCadastro
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setModoCadastro(true)
                setErro(null)
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                modoCadastro
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Cabeçalho do Formulário */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {tituloFormulario} 👋
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">
              {subTituloFormulario}
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {modoCadastro && (
              <TextField
                id="nome"
                rotulo="Nome completo"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
              />
            )}

            <TextField
              id="email"
              rotulo="E-mail / Usuário"
              type="email"
              placeholder="Digite seu usuário ou e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div className="relative">
              <TextField
                id="senha"
                rotulo="Senha"
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                erro={erro ?? undefined}
                autoComplete={modoCadastro ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-9 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                {mostrarSenha ? '🙈 Ocultar' : '👁️ Mostrar'}
              </button>
            </div>

            {modoCadastro && (
              <div className="relative">
                <TextField
                  id="confirmar-senha"
                  rotulo="Confirmar senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Confirme sua senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3.5 top-9 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  {mostrarSenha ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={enviando}
              className="w-full py-2.5 text-xs sm:text-sm font-bold glow-hover mt-1 rounded-xl"
            >
              {rotuloBotaoPrincipal}
            </Button>
          </form>

          {/* Links Secundários (Esqueceu a senha) */}
          {!modoCadastro && (
            <div className="flex items-center justify-center text-xs text-on-surface-variant">
              <button
                type="button"
                onClick={() => alert('Para redefinir a senha, utilize o backup ou limpe a sessão.')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {/* Social Logins */}
          <div className="flex flex-col gap-3 pt-1">
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-outline-variant/40" />
                <span className="absolute bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Ou continue com
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => alert('Login com Google em breve')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container/70 transition-all cursor-pointer shadow-sm"
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
                  className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container/70 transition-all cursor-pointer shadow-sm"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.81 1.44-.61.71-1.15 1.86-1 2.97 1.08.08 2.16-.57 2.82-1.37z"/>
                  </svg>
                  Apple
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
