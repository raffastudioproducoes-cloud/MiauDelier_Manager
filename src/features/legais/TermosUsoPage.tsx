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
          <h2 className="text-base font-bold text-primary">3. Autenticação, Armazenamento Local e Responsabilidade</h2>
          <p className="text-xs text-on-surface-variant">
            Ao utilizar nossos serviços, o usuário compreende a nossa arquitetura híbrida de segurança:
          </p>
          <ul className="list-disc pl-5 text-xs text-on-surface-variant flex flex-col gap-1.5 mt-1">
            <li><strong>Login e Identificação:</strong> O acesso é feito vinculando uma conta do Google, Apple ou via E-mail OTP. Essa etapa gerencia seu acesso e perfil na nuvem.</li>
            <li><strong>Cofre Local (Zero-Knowledge):</strong> Seus dados comerciais não vão para a internet de forma legível. Eles ficam salvos no seu aparelho e são criptografados localmente por uma "Senha do Cofre".</li>
            <li><strong>Perda da Senha do Cofre:</strong> Como a nossa arquitetura é de Zero-Knowledge, não temos acesso a essa senha e é impossível recuperá-la por nós. A perda da Senha do Cofre resultará na perda irreversível do acesso aos seus dados locais que foram cifrados com ela.</li>
            <li><strong>Backup:</strong> É de responsabilidade exclusiva do usuário manter cópias de segurança periódicas exportando seus dados na aba "Backup". A exclusão do histórico e dados do navegador pode apagar o banco de dados.</li>
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
