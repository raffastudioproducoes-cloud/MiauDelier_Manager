import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'

export function LoginForm() {
  const navigate = useNavigate()
  const contaConfigurada = useAuthStore((estado) => estado.contaConfigurada)
  const carregarEstadoInicial = useAuthStore((estado) => estado.carregarEstadoInicial)
  const entrar = useAuthStore((estado) => estado.entrar)
  const criarConta = useAuthStore((estado) => estado.criarConta)

  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Sem cleanup de propósito: carregarEstadoInicial() só faz set() na store Zustand, que não
  // gera warning nem efeito colateral local se o componente já tiver desmontado (diferente de
  // setState do React). Uma guarda "let ativo = true" aqui não protegeria nada real.
  useEffect(() => {
    carregarEstadoInicial()
  }, [carregarEstadoInicial])

  if (contaConfigurada === null) return <p>Carregando...</p>

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      if (contaConfigurada) {
        const sucesso = await entrar(senha)
        if (!sucesso) {
          setErro('Senha incorreta.')
          return
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-base)] p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">
            {contaConfigurada ? 'Entrar' : 'Criar senha'}
          </h1>
          <TextField
            id="senha"
            label="Senha"
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            error={erro ?? undefined}
          />
          <Button type="submit" disabled={enviando}>
            {contaConfigurada ? 'Entrar' : 'Criar senha'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
