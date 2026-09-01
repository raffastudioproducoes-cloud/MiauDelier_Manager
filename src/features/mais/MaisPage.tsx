import { Link } from '@tanstack/react-router'
import { Card } from '../../components/ui/Card'

const SECOES = [
  {
    titulo: 'Produção',
    links: [
      { rotulo: 'Materiais', rota: '/materiais' },
      { rotulo: 'Formas', rota: '/formas' },
      { rotulo: 'Peças', rota: '/pecas' },
      { rotulo: 'Categorias', rota: '/categorias' },
    ],
  },
  {
    titulo: 'Vendas',
    links: [
      { rotulo: 'Clientes', rota: '/clientes' },
      { rotulo: 'Pedidos', rota: '/pedidos' },
      { rotulo: 'Precificação', rota: '/precificacao' },
      { rotulo: 'Agenda', rota: '/agenda' },
    ],
  },
  {
    titulo: 'Financeiro',
    links: [
      { rotulo: 'Contas', rota: '/contas' },
      { rotulo: 'Transações', rota: '/transacoes' },
      { rotulo: 'Analytics', rota: '/analytics' },
    ],
  },
  {
    titulo: 'Sistema',
    links: [
      { rotulo: 'Configurações', rota: '/configuracoes' },
      { rotulo: 'Backup', rota: '/backup' },
      { rotulo: 'Auditoria', rota: '/auditoria' },
      { rotulo: 'Assistente', rota: '/assistente' },
    ],
  },
]

export function MaisPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Mais</h1>
        <p className="text-label-sm text-on-surface-variant">
          Hub central com atalhos para todas as seções da aplicação.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {SECOES.map((secao) => (
          <section key={secao.titulo} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-on-surface">{secao.titulo}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {secao.links.map((item) => (
                <Link key={item.rota} to={item.rota}>
                  <Card className="glow-hover h-full">
                    <div className="flex items-center justify-center py-6 text-center">
                      <p className="font-medium text-on-surface">{item.rotulo}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
