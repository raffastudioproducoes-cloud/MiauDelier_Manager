import { Link } from '@tanstack/react-router'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function MaisPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Mais</h1>
        <p className="text-label-sm text-on-surface-variant">
          Navegação unificada do ateliê.
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center gap-4 p-8 text-center border border-primary/20 bg-primary/5">
        <span className="text-4xl">✨</span>
        <div className="flex flex-col gap-1 max-w-md">
          <h2 className="text-base font-bold text-on-surface">Atalhos Unificados no Menu Principal</h2>
          <p className="text-sm text-on-surface-variant">
            Os botões duplicados foram limpos. Todas as ferramentas do ateliê (Produção, Vendas, Financeiro, Equipamentos, Taxas, Diagnóstico, Logs e Sistema) estão agora disponíveis diretamente no menu lateral / drawer.
          </p>
        </div>
        <Link to="/">
          <Button variante="ghost" className="border border-primary/30 text-primary">
            Ir para o Início
          </Button>
        </Link>
      </Card>
    </div>
  )
}

