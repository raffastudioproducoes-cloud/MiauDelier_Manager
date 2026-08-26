import { useEffect, useState } from 'react'
import { hasAccountConfigured, setupAccount, login } from '../../lib/auth'

export function LoginForm() {
  const [contaExiste, setContaExiste] = useState<boolean | null>(null)
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    hasAccountConfigured().then(setContaExiste)
  }, [])

  if (contaExiste === null) return <p>Carregando...</p>

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)
    try {
      if (contaExiste) {
        const chave = await login(senha)
        if (!chave) {
          setErro('Senha incorreta.')
          return
        }
        setMensagem('Login realizado.')
      } else {
        await setupAccount(senha)
        setMensagem('Conta criada com sucesso.')
        setContaExiste(true)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{contaExiste ? 'Entrar' : 'Criar senha'}</h1>
      <label htmlFor="senha">Senha</label>
      <input
        id="senha"
        type="password"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
      />
      <button type="submit" disabled={enviando}>
        {contaExiste ? 'Entrar' : 'Criar senha'}
      </button>
      {mensagem && <p>{mensagem}</p>}
      {erro && <p role="alert">{erro}</p>}
    </form>
  )
}
