import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export function CloudIdentityManager() {
  const { mostrarToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [identities, setIdentities] = useState<any[]>([])
  
  // Confirmação de senha local
  const [pedindoSenha, setPedindoSenha] = useState(false)
  const [senhaLocal, setSenhaLocal] = useState('')
  const [validandoSenha, setValidandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [providerParaLigar, setProviderParaLigar] = useState<string | null>(null)

  const entrar = useAuthStore((estado) => estado.entrar)

  useEffect(() => {
    carregarIdentidades()
  }, [])

  async function carregarIdentidades() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.identities) {
      setIdentities(user.identities)
    }
    setLoading(false)
  }

  function handleIniciarLigacao(provider: string) {
    setProviderParaLigar(provider)
    setSenhaLocal('')
    setErroSenha(null)
    setPedindoSenha(true)
  }

  async function confirmarEProsseguir() {
    if (!senhaLocal) {
      setErroSenha('Digite sua senha atual do cofre.')
      return
    }

    setValidandoSenha(true)
    setErroSenha(null)

    try {
      // 1. Validar a senha local (conforme requisito)
      const senhaValida = await entrar(senhaLocal)
      
      if (!senhaValida) {
        throw new Error('Senha do cofre incorreta. Tente novamente.')
      }

      // 2. Senha correta, prosseguir para o OAuth Link Identity
      const { error } = await supabase.auth.linkIdentity({ provider: providerParaLigar as any })
      
      if (error) {
        throw error
      }
      
      // O Supabase irá redirecionar automaticamente para a página do provedor
    } catch (err: any) {
      setErroSenha(err.message || 'Erro ao validar senha local e vincular.')
    } finally {
      setValidandoSenha(false)
    }
  }

  async function handleDesvincular(identity: any) {
    if (identities.length <= 1) {
      mostrarToast('Você precisa manter pelo menos uma forma de login na conta.', 'erro')
      return
    }

    try {
      const { error } = await supabase.auth.unlinkIdentity(identity)
      if (error) throw error
      mostrarToast(`Conta desvinculada com sucesso.`, 'sucesso')
      carregarIdentidades()
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao desvincular conta.', 'erro')
    }
  }

  const hasGoogle = identities.some(id => id.provider === 'google')
  
  if (loading) return null

  return (
    <>
      <Card className="border border-primary/20 bg-surface p-4 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            ☁️ Segurança e Nuvem
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Você pode mesclar sua conta com um login social (como Google). A sua <strong>Senha do Cofre</strong> continua sendo necessária para decifrar os dados (Zero-Knowledge), garantindo privacidade total.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!hasGoogle ? (
             <button
               type="button"
               onClick={() => handleIniciarLigacao('google')}
               className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container/70 transition-all cursor-pointer shadow-sm"
             >
               <svg className="h-4 w-4" viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
               </svg>
               Mesclar com Google
             </button>
          ) : (
            <div className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs font-semibold text-on-surface shadow-sm">
               <div className="flex items-center gap-2">
                 <svg className="h-4 w-4" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                 </svg>
                 <span>Vinculado ao Google</span>
               </div>
               <button 
                 type="button" 
                 onClick={() => handleDesvincular(identities.find(id => id.provider === 'google'))}
                 className="text-error hover:underline"
               >
                 Desvincular
               </button>
            </div>
          )}
        </div>
      </Card>

      {/* Modal para pedir senha do cofre local antes de vincular */}
      {pedindoSenha && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <Card className="w-full max-w-sm bg-surface p-5 border border-primary/20 shadow-2xl flex flex-col gap-4">
             <h2 className="text-lg font-bold text-on-surface">Confirme sua Senha Atual</h2>
             <p className="text-xs text-on-surface-variant">
               Para garantir sua segurança antes de alterar sua forma de login, digite sua <strong>Senha do Cofre</strong> local.
             </p>
             
             <div className="flex flex-col gap-1">
               <TextField
                 id="confirm-senha"
                 rotulo="Senha do Cofre"
                 type="password"
                 value={senhaLocal}
                 onChange={(e) => setSenhaLocal(e.target.value)}
                 erro={erroSenha ?? undefined}
                 placeholder="Sua senha secreta"
               />
             </div>

             <div className="flex items-center justify-end gap-2 mt-2">
               <Button type="button" variante="ghost" onClick={() => setPedindoSenha(false)}>
                 Cancelar
               </Button>
               <Button type="button" onClick={confirmarEProsseguir} disabled={validandoSenha || !senhaLocal}>
                 {validandoSenha ? 'Validando...' : 'Confirmar e Vincular'}
               </Button>
             </div>
           </Card>
         </div>
      )}
    </>
  )
}
