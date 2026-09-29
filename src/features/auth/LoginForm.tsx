import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import logoMiauDelier from '../../assets/logo-miaudelier.png'
import catFeederBanner from '../../assets/cats-feeder-login.jpg'

type AuthStep = 'SUPABASE_LOGIN' | 'OTP_VERIFICATION' | 'VAULT_UNLOCK' | 'VAULT_SETUP';

export function LoginForm() {
  const navigate = useNavigate()
  const contaConfigurada = useAuthStore((estado) => estado.contaConfigurada)
  const carregarEstadoInicial = useAuthStore((estado) => estado.carregarEstadoInicial)
  const entrar = useAuthStore((estado) => estado.entrar)
  const criarConta = useAuthStore((estado) => estado.criarConta)
  const autenticado = useAuthStore((estado) => estado.autenticado)

  // Supabase Auth State
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState<AuthStep>('SUPABASE_LOGIN')
  
  // Form State
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [senhaCofre, setSenhaCofre] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  
  // UI State
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    carregarEstadoInicial()
    
    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        avancarParaCofre()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        avancarParaCofre()
      } else {
        setStep('SUPABASE_LOGIN')
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregarEstadoInicial])

  useEffect(() => {
    // If the local vault is fully authenticated, go to dashboard
    if (autenticado) {
      navigate({ to: '/' })
    }
  }, [autenticado, navigate])

  function avancarParaCofre() {
    // Rely on local `contaConfigurada` state.
    if (contaConfigurada === false) {
      setStep('VAULT_SETUP')
    } else if (contaConfigurada === true) {
      setStep('VAULT_UNLOCK')
    }
  }

  useEffect(() => {
    if (session && contaConfigurada !== null) {
       avancarParaCofre()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contaConfigurada, session])

  // --- Handlers ---

  async function handleEnviarEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setEnviando(true)
    setErro(null)
    setMensagem(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setMensagem('Código enviado! Verifique seu e-mail (incluindo spam).')
      setStep('OTP_VERIFICATION')
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar e-mail.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleVerificarOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode) return
    setEnviando(true)
    setErro(null)
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' })
      if (error) throw error
      // onAuthStateChange will catch the session and advance to Vault
    } catch (err: any) {
      setErro(err.message || 'Código inválido.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleGoogleLogin() {
    setEnviando(true)
    setErro(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
      if (error) throw error
      // It will redirect to Google
    } catch (err: any) {
      setErro(err.message || 'Erro ao iniciar login com Google.')
      setEnviando(false)
    }
  }

  async function handleVaultSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)

    try {
      if (step === 'VAULT_SETUP') {
        if (senhaCofre !== confirmarSenha) {
          throw new Error('As senhas não coincidem.')
        }
        await criarConta(senhaCofre)
      } else {
        const sucesso = await entrar(senhaCofre)
        if (!sucesso) {
          throw new Error('Senha do cofre incorreta.')
        }
      }
      navigate({ to: '/' })
    } catch (err: any) {
      setErro(err.message || 'Falha ao acessar cofre local.')
    } finally {
      setEnviando(false)
    }
  }

  if (contaConfigurada === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-on-surface-variant">
        <p>Carregando estado local...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-on-surface flex flex-col md:flex-row font-sans">
      <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-surface-container-high/30 blur-[160px] pointer-events-none" />

      <div className="relative w-full md:w-[52%] lg:w-[55%] min-h-[340px] sm:min-h-[420px] md:min-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-10 z-10">
        <img
          src={catFeederBanner}
          alt="Comedor de Gatos MiauDelier"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent md:bg-gradient-to-r md:from-transparent md:via-background/50 md:to-background pointer-events-none" />
        
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5 backdrop-blur-md bg-background/70 p-3 px-5 sm:px-6 rounded-3xl border border-outline-variant/40 shadow-2xl">
            <img src={logoMiauDelier} alt="MiauDelier Logo" className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow-md" />
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-on-surface block leading-tight">MiauDelier</span>
              <span className="block text-xs font-extrabold text-primary uppercase tracking-widest mt-0.5">Manager</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-20 hidden sm:block">
          <p className="text-xs font-medium text-on-surface/90 backdrop-blur-md bg-background/40 px-3.5 py-2 rounded-xl border border-outline-variant/20 inline-block">
            © {new Date().getFullYear()} MiauDelier Manager — Sistema de Gestão para Ateliês.
          </p>
        </div>
      </div>

      <div className="hidden md:block absolute left-[35%] lg:left-[40%] right-[30%] lg:right-[35%] top-0 bottom-0 pointer-events-none z-20 bg-gradient-to-r from-transparent via-background/80 to-background" />

      <div className="relative z-30 flex-1 flex flex-col justify-center p-6 sm:p-10 md:p-12 lg:p-16 min-h-[480px] md:min-h-screen bg-background md:bg-transparent">
        <div className="w-full max-w-xs sm:max-w-sm mx-auto md:ml-6 lg:ml-10 flex flex-col gap-5">
          
          {step === 'SUPABASE_LOGIN' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Identifique-se 👋</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">
                  {contaConfigurada 
                    ? 'Identifique-se na nuvem para sincronizar seu cofre local.' 
                    : 'Crie ou acesse sua conta na nuvem.'}
                </p>
              </div>

              <form onSubmit={handleEnviarEmailOtp} className="flex flex-col gap-3.5">
                <TextField
                  id="email"
                  rotulo="E-mail"
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={enviando}
                />
                <Button type="submit" disabled={enviando || !email} className="w-full py-2.5 text-xs font-bold mt-1 rounded-xl">
                  {enviando ? 'Enviando...' : 'Enviar Código (OTP)'}
                </Button>
                {erro && <p className="text-xs text-error">{erro}</p>}
              </form>

              <div className="relative flex items-center justify-center pt-2">
                <div className="w-full border-t border-outline-variant/40" />
                <span className="absolute bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Ou use</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-3 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container/70 transition-all cursor-pointer shadow-sm"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continuar com Google
              </button>
            </>
          )}

          {step === 'OTP_VERIFICATION' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Confirme seu E-mail</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">Enviamos um código de 6 dígitos para <strong>{email}</strong>.</p>
              </div>

              <form onSubmit={handleVerificarOtp} className="flex flex-col gap-3.5">
                <TextField
                  id="otp"
                  rotulo="Código OTP"
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={enviando}
                />
                <Button type="submit" disabled={enviando || !otpCode} className="w-full py-2.5 text-xs font-bold mt-1 rounded-xl">
                  {enviando ? 'Verificando...' : 'Entrar'}
                </Button>
                {erro && <p className="text-xs text-error">{erro}</p>}
                {mensagem && <p className="text-xs text-emerald-400">{mensagem}</p>}
                <button type="button" onClick={() => setStep('SUPABASE_LOGIN')} className="text-xs text-primary mt-2 cursor-pointer hover:underline">Voltar</button>
              </form>
            </>
          )}

          {(step === 'VAULT_UNLOCK' || step === 'VAULT_SETUP') && (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {step === 'VAULT_SETUP' ? 'Crie seu Cofre 🔐' : 'Abra o Cofre 🔐'}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">
                  {step === 'VAULT_SETUP' 
                    ? 'Crie uma Senha do Cofre local. Ela criptografará seus dados financeiros (Zero-Knowledge).'
                    : 'Digite a Senha do Cofre que você configurou para decifrar seus dados locais.'}
                </p>
                <div className="mt-2 text-xs text-emerald-400 font-medium">
                  ✓ Nuvem conectada: {session?.user?.email}
                </div>
              </div>

              <form onSubmit={handleVaultSubmit} className="flex flex-col gap-3.5">
                <div className="relative">
                  <TextField
                    id="senhaCofre"
                    rotulo="Senha do Cofre"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Sua senha secreta local"
                    value={senhaCofre}
                    onChange={(e) => setSenhaCofre(e.target.value)}
                    erro={erro ?? undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3.5 top-9 text-xs font-medium text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    {mostrarSenha ? '🙈' : '👁️'}
                  </button>
                </div>

                {step === 'VAULT_SETUP' && (
                  <TextField
                    id="confirmar-senha"
                    rotulo="Confirmar Senha"
                    type="password"
                    placeholder="Confirme sua senha secreta"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                )}

                <Button type="submit" disabled={enviando || !senhaCofre} className="w-full py-2.5 text-xs font-bold mt-1 rounded-xl">
                  {step === 'VAULT_SETUP' ? 'Salvar e Acessar' : 'Decifrar Dados'}
                </Button>
                
                <div className="mt-2 text-center">
                   <button 
                      type="button" 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setStep('SUPABASE_LOGIN');
                      }} 
                      className="text-xs text-error hover:underline cursor-pointer"
                   >
                     Desconectar conta da Nuvem
                   </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
