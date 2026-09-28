import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'

interface PerguntaFAQ {
  id: string
  categoria: 'basica' | 'producao' | 'precificacao' | 'seguranca' | 'backup'
  pergunta: string
  resposta: string
  tags: string[]
}

const FAQ_LISTA: PerguntaFAQ[] = [
  // BÁSICAS
  {
    id: 'faq-1',
    categoria: 'basica',
    pergunta: 'O que é o MiauDelier Manager e para quem ele foi desenvolvido?',
    resposta:
      'O MiauDelier Manager é um sistema de gestão completo desenvolvido especialmente para ateliês de resina epóxi, peças personalizadas e artesanato. Ele gerencia estoque de insumos, moldes de silicone, amortização, cálculo de resina/bolhas, custos de luz e água por concessionária local, mão de obra por dia/hora, taxas de marketplaces (Shopee, Elo7, Mercado Livre), emissão de pedidos, curas e finanças.',
    tags: ['introdução', 'ateliê', 'resina', 'artesanato', 'geral'],
  },
  {
    id: 'faq-2',
    categoria: 'basica',
    pergunta: 'Meus dados ficam salvos na internet ou no meu próprio dispositivo?',
    resposta:
      'Em total respeito à sua privacidade e conformidade com a LGPD, o MiauDelier Manager opera sob o conceito de "Local-First". Todos os seus dados (clientes, peças, valores e contas) ficam armazenados exclusivamente no banco de dados local criptografado (IndexedDB) do seu navegador. Nenhum dado financeiro ou pessoal é enviado para servidores externos.',
    tags: ['dados', 'privacidade', 'local-first', 'armazenamento', 'lgpd'],
  },
  {
    id: 'faq-3',
    categoria: 'basica',
    pergunta: 'O aplicativo precisa de conexão com a internet para funcionar?',
    resposta:
      'Não! O aplicativo funciona 100% offline para todas as funções de cadastro, precificação, agenda e controle financeiro. A internet é necessária apenas para duas funções pontuais: consultar automaticamente as tarifas atualizadas de luz/água da sua concessionária e enviar perguntas ao Assistente de IA Gemini (opcional).',
    tags: ['offline', 'internet', 'concessionária', 'pwa'],
  },
  {
    id: 'faq-4',
    categoria: 'basica',
    pergunta: 'O que é e como funciona o Assistente de IA Gemini no MiauDelier?',
    resposta:
      'O Assistente de IA é uma inteligência artificial integrada que ajuda tirando dúvidas técnicas sobre cura de resina, proporção A/B, cálculo de pigmentos, dicas de vendas e estratégias de marketing. Você pode utilizar sua própria chave de API gratuita do Google Gemini, que é cifrada no seu navegador e não é compartilhada com ninguém.',
    tags: ['ia', 'gemini', 'assistente', 'chave api'],
  },

  // PRODUÇÃO E CÁLCULO DE RESINA
  {
    id: 'faq-5',
    categoria: 'producao',
    pergunta: 'Como o aplicativo calcula a quantidade exata de resina para moldes?',
    resposta:
      'Ao cadastrar um molde na aba "Formas", você pode informar o formato geométrico (cubo, cilindro, esfera, pirâmide) com as dimensões em centímetros ou o volume direto em mililitros. O MiauDelier calcula automaticamente o volume total em ml e considera a densidade da resina para que você saiba exatamente quanto misturar de Resina (Componente A) e Endurecedor (Componente B), evitando desperdícios.',
    tags: ['resina', 'componente a', 'componente b', 'moldes', 'volume'],
  },
  {
    id: 'faq-6',
    categoria: 'producao',
    pergunta: 'Como funciona o tempo de cura e como o app me notifica quando a peça está pronta?',
    resposta:
      'Cada produto cadastrado possui um tempo de cura recomendado em horas. Ao registrar uma produção, o sistema inicia um cronômetro de cura persistente. Quando o tempo atinge o limite (ex: 24h para desmolde inicial ou 72h para cura total), o aplicativo gera um aviso sonoro/visual na aba de Notificações para que você desmolde a peça com segurança.',
    tags: ['cura', 'desmolde', 'notificação', 'cronômetro'],
  },
  {
    id: 'faq-7',
    categoria: 'producao',
    pergunta: 'O que é o cálculo de amortização de moldes de silicone?',
    resposta:
      'Moldes de silicone sofrem desgaste natural com o número de tiragens (desmoldes). O MiauDelier divide o valor investido na compra/confecção da forma pela sua vida útil estimada de usos (ex: molde de R$ 50,00 que dura 50 usos = R$ 1,00 de amortização por peça). Esse custo é incluído automaticamente no preço final para garantir que você recupere o dinheiro do molde antes que ele rasgue ou estrague.',
    tags: ['moldes', 'silicone', 'amortização', 'vida útil'],
  },

  // PRECIFICAÇÃO E TAXAS
  {
    id: 'faq-8',
    categoria: 'precificacao',
    pergunta: 'Como é calculada a tarifa de energia elétrica (luz) e água da produção?',
    resposta:
      'No componente 3 da aba "Precificação", você pode selecionar seu Estado e Cidade para buscar a tarifa média por kWh da concessionária de energia da sua região (ex: Light, Enel, Cemig) e a tarifa por m³ de água. Ao vincular equipamentos como sopradores térmicos, câmaras de vácuo ou lâmpadas UV, o app calcula os minutos de uso exatos convertidos em R$. O mesmo se aplica aos litros de água usados no lixamento a água.',
    tags: ['luz', 'energia', 'água', 'concessionária', 'equipamentos'],
  },
  {
    id: 'faq-9',
    categoria: 'precificacao',
    pergunta: 'Como funciona a mão de obra por dia e por hora trabalhada?',
    resposta:
      'Na aba "Precificação" (Seção 4), você define a sua meta de salário diário (ex: R$ 200,00 / dia) e sua jornada de trabalho (ex: 8 horas / dia). O MiauDelier calcula automaticamente o valor por hora (ex: R$ 25,00 / hora). Na criação do produto, você informa o tempo dedicado à confecção (ex: 1,5 horas) e o valor proporcional da sua mão de obra é incorporado ao produto.',
    tags: ['mão de obra', 'salário', 'hora trabalhada', 'jornada'],
  },
  {
    id: 'faq-10',
    categoria: 'precificacao',
    pergunta: 'Como incluir as taxas da Shopee, Mercado Livre, Elo7 ou Maquininha?',
    resposta:
      'Na aba "Taxas & Canais", você cadastra as porcentagens e taxas fixas de cada canal de venda (ex: Shopee 14% + R$ 4,00). Na aba "Precificação", basta selecionar o canal desejado no seletor para que o preço de venda recomendado seja reajustado automaticamente para cobrir a comissão e manter o seu lucro líquido intacto.',
    tags: ['taxas', 'shopee', 'mercado livre', 'elo7', 'marketplace'],
  },

  // SEGURANÇA E LGPD
  {
    id: 'faq-11',
    categoria: 'seguranca',
    pergunta: 'Como funciona a criptografia AES no banco de dados local?',
    resposta:
      'O MiauDelier Manager utiliza a API nativa Web Crypto (`SubtleCrypto`) do navegador com o algoritmo AES-GCM (Advanced Encryption Standard com chave de 256 bits). Campos sensíveis (como valores financeiros, contatos de clientes e chaves de API) são cifrados usando uma chave mestre derivada da sua senha antes de serem gravados no IndexedDB. Nem mesmo extensões maliciosas ou inspeções brutas do navegador conseguem ler seus dados em texto claro.',
    tags: ['criptografia', 'aes-gcm', 'segurança', 'indexeddb', 'webcrypto'],
  },
  {
    id: 'faq-12',
    categoria: 'seguranca',
    pergunta: 'Como o MiauDelier Manager cumpre a LGPD (Lei 13.709/2018)?',
    resposta:
      'O MiauDelier cumpre a LGPD por design (Privacy by Design). Como não coletamos nem armazenamos seus dados em servidores proprietários, você é o controlador soberano de todas as informações. Garantimos todos os direitos do Artigo 18 da LGPD: acesso, retificação, portabilidade (exportação de backup JSON) e exclusão total de dados diretamente pelo sistema.',
    tags: ['lgpd', 'lei 13.709', 'direitos do titular', 'privacy by design'],
  },
  {
    id: 'faq-13',
    categoria: 'seguranca',
    pergunta: 'Como posso exercer o meu direito à exclusão total de dados (Art. 18 LGPD)?',
    resposta:
      'Para apagar permanentemente todos os dados armazenados no seu dispositivo, acesse o menu "Backup" e utilize a função "Apagar Todos os Dados do Ateliê". Essa ação limpa o banco de dados IndexedDB e as chaves de criptografia locais de forma irreversível, mantendo apenas a estrutura limpa do seu perfil.',
    tags: ['exclusão', 'zerar dados', 'lgpd', 'artigo 18', 'limpeza'],
  },

  // BACKUP E MANUTENÇÃO
  {
    id: 'faq-14',
    categoria: 'backup',
    pergunta: 'Como fazer backup seguro e salvar meus dados em outro computador ou celular?',
    resposta:
      'Vá até a aba "Backup" e clique em "Gerar Backup do Ateliê (JSON)". O sistema criará um arquivo `.json` criptografado contendo todo o seu histórico. Para transferir para outro dispositivo, abra o MiauDelier no novo aparelho, entre com a mesma senha e importe o arquivo de backup.',
    tags: ['backup', 'json', 'exportar', 'importar', 'transferir'],
  },
  {
    id: 'faq-15',
    categoria: 'backup',
    pergunta: 'O que acontece se eu limpar o histórico e cache do meu navegador?',
    resposta:
      'Se você optar por limpar todos os "Dados de Sites e Armazenamento do Navegador" nas configurações do seu navegador (Chrome, Edge, Firefox, Safari), o banco de dados IndexedDB pode ser apagado pelo próprio navegador. Por isso, recomendamos gerar um arquivo de backup em JSON periodicamente!',
    tags: ['cache', 'limpeza navegador', 'cuidados', 'backup recomendado'],
  },
]

export function AjudaSuportePage() {
  const { mostrarToast } = useToast()
  const [termoBusca, setTermoBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [faqAbertoId, setFaqAbertoId] = useState<string | null>('faq-1')
  const [abaAtiva, setAbaAtiva] = useState<'passo-a-passo' | 'modulos' | 'faq' | 'lgpd'>('passo-a-passo')

  function copiarEmailSuporte() {
    navigator.clipboard.writeText('contato.raffasp@gmail.com')
    mostrarToast('E-mail do suporte copiado com sucesso! (contato.raffasp@gmail.com)', 'sucesso')
  }

  const faqsFiltrados = FAQ_LISTA.filter((item) => {
    const combinaCategoria = categoriaAtiva === 'todas' || item.categoria === categoriaAtiva
    const termo = termoBusca.toLowerCase().trim()
    if (!termo) return combinaCategoria

    const combinaTexto =
      item.pergunta.toLowerCase().includes(termo) ||
      item.resposta.toLowerCase().includes(termo) ||
      item.tags.some((tag) => tag.toLowerCase().includes(termo))

    return combinaCategoria && combinaTexto
  })

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Cabeçalho de Suporte & Boas-Vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <h1 className="text-2xl font-bold text-on-surface">Central de Ajuda, Suporte & Guia Passo a Passo</h1>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Tudo o que você precisa para dominar o MiauDelier Manager e gerenciar seu ateliê de artesanato e resina com segurança total.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variante="primary" onClick={() => window.open('mailto:contato.raffasp@gmail.com', '_blank')}>
            ✉️ Falar com o Suporte Técnico
          </Button>
        </div>
      </div>

      {/* Card de Contato Oficial & Suporte */}
      <Card className="bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl">
            🎧
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-primary tracking-wide">Atendimento ao Cliente & Suporte Técnico</span>
            <span className="text-base font-bold text-on-surface">contato.raffasp@gmail.com</span>
            <span className="text-xs text-on-surface-variant">
              Desenvolvido por <strong>Raffa Studio Produções</strong> — Empresa registrada desde 2026.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button type="button" variante="ghost" className="text-xs w-full sm:w-auto" onClick={copiarEmailSuporte}>
            📋 Copiar E-mail
          </Button>

          <a
            href="mailto:contato.raffasp@gmail.com"
            className="text-xs px-3 py-2 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity text-center w-full sm:w-auto"
          >
            Enviar Mensagem
          </a>
        </div>
      </Card>

      {/* Navegação por Abas Principais */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/30 pb-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('passo-a-passo')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            abaAtiva === 'passo-a-passo'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          🚀 Primeiros Passos (Do Começo ao Fim)
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('modulos')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            abaAtiva === 'modulos'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          🧩 Guia de Cada Módulo do App
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('faq')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            abaAtiva === 'faq'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          ❓ FAQ & Perguntas Frequentes
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('lgpd')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            abaAtiva === 'lgpd'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          🛡️ Proteção de Dados & LGPD
        </button>
      </div>

      {/* CONTEÚDO 1: PRIMEIROS PASSOS DO COMEÇO AO FIM */}
      {abaAtiva === 'passo-a-passo' && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/20">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span>🎯</span> Como usar o MiauDelier Manager do começo ao fim
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Siga esta sequência de 7 passos para organizar seu ateliê, garantir a precificação correta de cada peça e nunca mais ter prejuízo!
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Passo 1 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 1</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Configuração Inicial</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">1. Defina o Perfil do seu Ateliê & Chave da IA (Opcional)</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Acesse o menu <strong>Perfil do Ateliê</strong> para personalizar a identidade do seu ateliê. Se quiser tirar dúvidas técnicas via inteligência artificial, vá até <strong>Configurações</strong> e insira sua chave gratuita do Google Gemini.
              </p>
            </Card>

            {/* Passo 2 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 2</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Estoque de Entrada</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">2. Cadastre Categorias & Insumos em "Materiais"</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Vá em <strong>Categorias</strong> para organizar (ex: Resinas, Endurecedores, Pigmentos, Glitter, Embalagens). Em seguida, vá em <strong>Materiais</strong> e registre cada compra com o valor pago e a quantidade (gramas, ml ou unidades). O sistema calcula o custo unitário exato por grama ou ml!
              </p>
            </Card>

            {/* Passo 3 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 3</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Moldes & Equipamentos</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">3. Cadastre Moldes em "Formas" e Ferramentas em "Equipamentos"</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Em <strong>Formas</strong>, cadastre seus moldes de silicone informando o valor pago e a vida útil estimada de tiragens. O app calculará a taxa de amortização por uso! Em <strong>Equipamentos</strong>, cadastre seus sopradores térmicos, câmaras de vácuo ou lâmpadas UV com a potência em Watts.
              </p>
            </Card>

            {/* Passo 4 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 4</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Ficha Técnica</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">4. Crie seus Produtos na aba "Peças"</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Em <strong>Peças</strong>, crie a ficha técnica do seu produto (ex: Chaveiro Letra com Ouro). Vincule a Forma (molde) utilizada, os materiais e quantidades gastas (ex: 15ml de resina, 0.5g de folha de ouro, 1 argola) e o tempo de mão de obra direta.
              </p>
            </Card>

            {/* Passo 5 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 5</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Formação de Preço</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">5. Calcule a Precificação Completa & Salve no Produto</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Acesse a aba <strong>Precificação</strong> e selecione a Peça cadastrada. O app puxará automaticamente o custo dos materiais e do molde. Escolha sua região para aplicar as tarifas de energia (luz) e água da sua concessionária, informe seu salário por dia trabalhado (mão de obra), a margem de lucro % desejada e selecione a taxa do marketplace cadastrada na aba <strong>Taxas & Canais</strong> (ex: Shopee ou Elo7). Clique em <em>"Salvar como Preço de Venda da Peça"</em>!
              </p>
            </Card>

            {/* Passo 6 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 6</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Vendas & Produção</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">6. Cadastre "Clientes" e Emita "Pedidos"</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cadastre seus clientes na aba <strong>Clientes</strong> e emita novos orçamentos ou pedidos na aba <strong>Pedidos</strong>. Ao salvar o pedido com prazo de entrega, ele entra automaticamente na sua <strong>Agenda</strong> e dispara o controle de tempo de cura das resinas!
              </p>
            </Card>

            {/* Passo 7 */}
            <Card className="flex flex-col gap-2 p-4 border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Passo 7</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Gestão Financeira & Backup</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">7. Acompanhe o Financeiro, Analytics & Faça Backups</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Utilize a aba <strong>Transações</strong> para registrar entradas e saídas de caixa. Consulte o <strong>Analytics</strong> e o <strong>Diagnóstico</strong> para ver seu lucro líquido real e a nota de saúde financeira do seu ateliê. Por fim, lembre-se de ir até a aba <strong>Backup</strong> semanalmente para baixar o arquivo `.json` criptografado com todos os seus dados!
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* CONTEÚDO 2: GUIA DE CADA MÓDULO DO APLICATIVO */}
      {abaAtiva === 'modulos' && (
        <div className="flex flex-col gap-5">
          <div className="bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/20">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span>🧩</span> Explicação detalhada das funções de cada menu
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Entenda o objetivo de cada tela do MiauDelier Manager e aprenda a tirar o máximo proveito da ferramenta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">📊 Início (Dashboard) & Analytics</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Exibe o resumo em tempo real do faturamento mensal, lucro líquido estimado, alertas de insumos com estoque baixo, cronômetro de cura de peças e atalhos rápidos para novas vendas.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">🧪 Materiais & Categorias</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cadastro e controle de saldo do estoque de resinas, pigmentos, molduras, chaveiros e embalagens. Permite registrar compras com reposição automática de estoque e lançamento de saída financeira.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">🧱 Formas (Moldes de Silicone)</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cadastro de formas geométricas ou sob medida. O sistema calcula o volume em ml para mistura da resina A/B e calcula o valor da amortização por uso com base no custo de compra do molde.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">🛠️ Equipamentos</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Controle de ferramentas elétricas do ateliê (sopradores, câmaras de vácuo, politrizes, lâmpadas UV). Armazena a potência em Watts para calcular o custo exato em R$ de energia elétrica por peça.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">🏷️ Precificação Completa</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                A calculadora mais avançada do mercado para resineiros. Soma matéria-prima, sobras de desperdício, energia elétrica da concessionária local, consumo de água, mão de obra por dia/hora, taxa de marketplace e margem de lucro.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">🛍️ Taxas & Canais</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cadastre as taxas de comissão e tarifas fixas de marketplaces como Shopee, Elo7, Mercado Livre, Instagram e Maquininhas de Cartão para garantir que as taxas sejam repassadas no preço final.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">👥 Clientes & Pedidos</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Gestão de contatos de clientes criptografados com visualização do histórico de compras. Emissão de pedidos vinculando peças, com status de produção (Orçamento, Em Produção, Concluído, Entregue).
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">📅 Agenda & Notificações de Cura</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Visão de calendário de entregas dos pedidos e controle dos horários em que cada peça de resina estará curada e pronta para o desmolde.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">💳 Contas & Transações</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Gestão de contas bancárias/caixa físico do ateliê. Registro de receitas de vendas e despesas operacionais (aluguel, internet, insumos) com cifras AES locais.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">💾 Backup & Segurança</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Geração de arquivo de backup criptografado em formato JSON para exportação/importação e opção de exclusão definitiva de dados em conformidade com a LGPD.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* CONTEÚDO 3: FAQ E PERGUNTAS FREQUENTES */}
      {abaAtiva === 'faq' && (
        <div className="flex flex-col gap-5">
          {/* Barra de Pesquisa e Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/20">
            <div className="w-full sm:w-1/2">
              <TextField
                id="busca-faq"
                rotulo="Pesquisar no FAQ"
                placeholder="Digite palavras como resina, luz, backup, lgpd, taxas..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCategoriaAtiva('todas')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoriaAtiva === 'todas'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                Todas ({FAQ_LISTA.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoriaAtiva('basica')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoriaAtiva === 'basica'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                🟢 Básicas
              </button>
              <button
                type="button"
                onClick={() => setCategoriaAtiva('producao')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoriaAtiva === 'producao'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                ⚙️ Produção
              </button>
              <button
                type="button"
                onClick={() => setCategoriaAtiva('precificacao')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoriaAtiva === 'precificacao'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                💰 Precificação
              </button>
              <button
                type="button"
                onClick={() => setCategoriaAtiva('seguranca')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoriaAtiva === 'seguranca'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                🛡️ Segurança/LGPD
              </button>
              <button
                type="button"
                onClick={() => setCategoriaAtiva('backup')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoriaAtiva === 'backup'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                💾 Backup
              </button>
            </div>
          </div>

          {/* Lista de Sanfonas de FAQ */}
          <div className="flex flex-col gap-3">
            {faqsFiltrados.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🔍</span>
                <p className="text-base font-semibold text-on-surface">Nenhuma pergunta encontrada</p>
                <p className="text-xs text-on-surface-variant">Tente buscar por termos mais genéricos ou entre em contato com nosso suporte técnico.</p>
              </Card>
            ) : (
              faqsFiltrados.map((faq) => {
                const estaAberto = faqAbertoId === faq.id
                return (
                  <div
                    key={faq.id}
                    className="glass-card rounded-xl overflow-hidden border border-outline-variant/15 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setFaqAbertoId(estaAberto ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-on-surface hover:bg-surface-container-high/40 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-primary font-bold">Q.</span> {faq.pergunta}
                      </span>
                      <span className="text-xs text-on-surface-variant shrink-0 ml-2">
                        {estaAberto ? '▲' : '▼'}
                      </span>
                    </button>

                    {estaAberto && (
                      <div className="p-4 pt-0 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/10 bg-surface-container-high/20 flex flex-col gap-3">
                        <p className="pt-3">{faq.resposta}</p>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {faq.tags.map((tag) => (
                            <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO 4: PROTEÇÃO DE DADOS & LGPD */}
      {abaAtiva === 'lgpd' && (
        <div className="flex flex-col gap-6">
          <Card className="p-5 flex flex-col gap-4 border-l-4 border-l-success bg-success/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span>🛡️</span> Declaração de Conformidade LGPD (Lei nº 13.709/2018)
              </h2>
              <span className="text-xs bg-success text-on-success px-2.5 py-1 rounded-full font-bold">
                Privacy by Design & Default
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              O <strong>MiauDelier Manager</strong>, desenvolvido pela <strong>Raffa Studio Produções (Empresa registrada desde 2026)</strong>, foi arquitetado do zero respeitando rigorosamente a Lei Geral de Proteção de Dados Pessoais do Brasil (LGPD).
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">🔐 Armazenamento 100% Local</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Não possuímos servidores centralizados onde seus dados financeiros ou de clientes ficam salvos. Tudo permanece no banco de dados local criptografado (IndexedDB) do seu próprio computador ou celular.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">🔑 Criptografia Forte AES-256</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Valores de vendas, contatos de clientes e chaves de API são cifrados no seu navegador via algoritmo AES-GCM com chave derivada da sua senha master através da Web Crypto API.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">📥 Portabilidade (Art. 18 V)</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Você tem o direito de exportar todos os seus dados a qualquer momento. Na aba de Backup, o arquivo `.json` permite transportar todo o seu ateliê para qualquer outro dispositivo com total autonomia.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">🗑️ Direito à Exclusão (Art. 18 VI)</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Em conformidade com a LGPD, o aplicativo oferece a função de eliminação completa e irreversível dos dados na aba de Backup, garantindo a zeragem definitiva das informações armazenadas.
              </p>
            </Card>
          </div>

          <Card className="p-4 bg-surface-container-high/40 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-on-surface">Encarregado pelo Tratamento de Dados (DPO) & Suporte Legal</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Dúvidas sobre o tratamento de dados ou solicitações referentes aos seus direitos de titular podem ser enviadas diretamente para o nosso encarregado legal através do e-mail oficial:
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm font-bold text-primary">contato.raffasp@gmail.com</span>
              <Button type="button" variante="ghost" className="text-xs px-2 py-1" onClick={copiarEmailSuporte}>
                Copiar E-mail
              </Button>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 mt-1">
              Raffa Studio Produções — Todos os direitos reservados. Desde 2026.
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
