import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'

export function TermosUsoPage() {
  const { mostrarToast } = useToast()

  function copiarEmail() {
    navigator.clipboard.writeText('contato.raffasp@gmail.com')
    mostrarToast('E-mail de suporte copiado! (contato.raffasp@gmail.com)', 'sucesso')
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-outline-variant/20 pb-4">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span>📜</span> Termos de Uso e Condições do Serviço
        </h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Vigor a partir de 2026 · Desenvolvido por Raffa Studio Produções (Empresa registrada desde 2026).
        </p>
      </div>

      <Card className="p-6 flex flex-col gap-6 text-sm text-on-surface leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-primary">1. Aceitação dos Termos</h2>
          <p className="text-xs text-on-surface-variant">
            Ao utilizar o sistema <strong>MiauDelier Manager</strong>, você concorda expressamente com os presentes Termos de Uso. Caso não concorde com qualquer disposição aqui prevista, solicitamos que descontinue a utilização do aplicativo.
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">2. Descrição dos Serviços</h2>
          <p className="text-xs text-on-surface-variant">
            O MiauDelier Manager é uma plataforma de gestão de ateliês de resina e artesanato, oferecendo ferramentas para controle de insumos, cálculo de sobras de resina, tempo de cura, precificação completa (luz, água, mão de obra, taxas de marketplace e margem de lucro), cadastro de clientes e registros financeiros.
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">3. Armazenamento Local e Responsabilidade sobre Backups</h2>
          <p className="text-xs text-on-surface-variant">
            Como o MiauDelier Manager é uma aplicação <strong>Local-First</strong> e não armazena cópias das suas informações em servidores externos, o usuário reconhece que:
          </p>
          <ul className="list-disc pl-5 text-xs text-on-surface-variant flex flex-col gap-1.5 mt-1">
            <li>É de responsabilidade exclusiva do usuário manter cópias de segurança (backups) periódicas dos seus dados utilizando a ferramenta de exportação em JSON na aba "Backup".</li>
            <li>A exclusão do histórico do navegador pelo usuário sem backup prévio pode resultar na perda irreversível dos dados locais.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">4. Propriedade Intelectual</h2>
          <p className="text-xs text-on-surface-variant">
            Todos os direitos de propriedade intelectual sobre a marca MiauDelier Manager, códigos-fonte, algoritmos de precificação, layout e identidade visual pertencem à <strong>Raffa Studio Produções (Empresa registrada desde 2026)</strong>.
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">5. Canais de Suporte Técnico & Legislação Aplicável</h2>
          <p className="text-xs text-on-surface-variant">
            Estes termos são regidos pelas leis da República Federativa do Brasil. Para dúvidas, sugestões ou suporte técnico, entre em contato através do e-mail oficial:
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 mt-1">
            <div>
              <p className="text-xs font-bold text-on-surface">Raffa Studio Produções — Empresa registrada desde 2026</p>
              <p className="text-xs text-primary font-semibold">E-mail: contato.raffasp@gmail.com</p>
            </div>
            <Button type="button" variante="ghost" className="text-xs" onClick={copiarEmail}>
              📋 Copiar E-mail
            </Button>

          </div>
        </section>
      </Card>
    </div>
  )
}
