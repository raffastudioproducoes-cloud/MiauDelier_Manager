import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'

export function PoliticaPrivacidadePage() {
  const { mostrarToast } = useToast()

  function copiarEmail() {
    navigator.clipboard.writeText('contato.raffasp@gmail.com')
    mostrarToast('E-mail de suporte copiado! (contato.raffasp@gmail.com)', 'sucesso')
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-outline-variant/20 pb-4">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span>🔒</span> Política de Privacidade & Proteção de Dados (LGPD)
        </h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Última atualização: Setembro de 2026 · Conforme a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
        </p>
      </div>

      <Card className="p-6 flex flex-col gap-6 text-sm text-on-surface leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-primary">1. Quem Somos & Compromisso com a Privacidade</h2>
          <p className="text-xs text-on-surface-variant">
            O <strong>MiauDelier Manager</strong> é uma aplicação de gestão para ateliês de resina epóxi e artesanato desenvolvida e operada por <strong>Raffa Studio Produções</strong> (Empresa registrada desde 2026).
            Temos como compromisso fundamental a transparência total, a segurança da informação e a privacidade absoluta dos dados dos nossos usuários.
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">2. Autenticação e Arquitetura "Local-First"</h2>
          <p className="text-xs text-on-surface-variant">
            O MiauDelier Manager adota um modelo híbrido focado em segurança <strong>Zero-Knowledge</strong> e <strong>Local-First</strong> (Local Primeiro). Isso significa que:
          </p>
          <ul className="list-disc pl-5 text-xs text-on-surface-variant flex flex-col gap-1.5 mt-1">
            <li><strong>Gestão de Identidade Segura:</strong> Utilizamos serviços de autenticação padrão de mercado (via Google, Apple ou Código por E-mail OTP) para criar sua conta. Não salvamos senhas de acesso.</li>
            <li><strong>Armazenamento 100% Local:</strong> Seus dados de negócio (clientes, transações, peças e valores) ficam gravados <em>exclusivamente</em> no armazenamento local (IndexedDB) do seu próprio dispositivo, nunca em nossos servidores.</li>
            <li><strong>Autonomia do Titular:</strong> Você possui controle soberano e exclusivo sobre as informações armazenadas no seu dispositivo, com a chave nas suas mãos.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">3. Criptografia e Segurança dos Dados (AES-256)</h2>
          <p className="text-xs text-on-surface-variant">
            Para garantir a confidencialidade das informações mesmo em caso de acesso físico ao seu dispositivo por terceiros, aplicamos camadas de segurança robustas:
          </p>
          <ul className="list-disc pl-5 text-xs text-on-surface-variant flex flex-col gap-1.5 mt-1">
            <li>Campos sensíveis (como contatos de clientes, saldos de contas e chave de API do Gemini) são criptografados com o algoritmo <strong>AES-GCM (256 bits)</strong> via API nativa Web Crypto do navegador.</li>
            <li>A chave de criptografia é derivada da sua senha master e expira automaticamente ao encerrar a sessão.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">4. Direitos do Titular sob a LGPD (Artigo 18)</h2>
          <p className="text-xs text-on-surface-variant">
            Em estrita observância ao Artigo 18 da Lei nº 13.709/2018, garantimos a você os seguintes direitos exercíveis diretamente na plataforma:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="p-3 bg-surface-container-high/30 rounded-lg border border-outline-variant/15 text-xs">
              <strong>I. Confirmação e Acesso:</strong> Você pode visualizar todos os dados salvos navegando pelas abas do aplicativo.
            </div>
            <div className="p-3 bg-surface-container-high/30 rounded-lg border border-outline-variant/15 text-xs">
              <strong>II. Correção de Dados:</strong> Edite ou atualize qualquer informação diretamente nos formulários do sistema.
            </div>
            <div className="p-3 bg-surface-container-high/30 rounded-lg border border-outline-variant/15 text-xs">
              <strong>III. Portabilidade (Backup):</strong> Exporte todo o banco de dados em formato JSON criptografado na aba de Backup.
            </div>
            <div className="p-3 bg-surface-container-high/30 rounded-lg border border-outline-variant/15 text-xs">
              <strong>IV. Eliminação dos Dados:</strong> Apague de forma definitiva e irreversível todos os dados na opção "Apagar Todos os Dados".
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
          <h2 className="text-base font-bold text-primary">5. Encarregado pelo Tratamento de Dados (DPO) & Contato</h2>
          <p className="text-xs text-on-surface-variant">
            Para dúvidas relativas a esta Política de Privacidade ou para exercer qualquer direito legal referente à proteção de dados, entre em contato com nosso Encarregado de Dados:
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
