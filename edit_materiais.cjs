const fs = require('fs');
const path = 'C:/Users/rafae/Documents/Projetos/MiauDelier Manager/src/features/producao/MateriaisPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. DIVISOES_ESTOQUE -> DIVISOES_PADRAO
content = content.replace(/export const DIVISOES_ESTOQUE = \[[\s\S]*?\]\n/, `export const DIVISOES_PADRAO = [
  { id: 'todos', rotulo: 'Todos', icone: '🌐' },
  { id: 'consumivel', rotulo: 'Insumos / Consumíveis', icone: '🧪' },
  { id: 'ferramenta', rotulo: 'Ferramentas & Equipamentos', icone: '🛠️' },
  { id: 'administrativo', rotulo: 'Administrativo & Embalagens', icone: '📦' },
  { id: 'epi', rotulo: 'EPIs & Proteção', icone: '🥽' },
]
`);

// 2. Constants
content = content.replace(/const NOVA_CATEGORIA = '__nova__'\nconst NOVA_SUBCATEGORIA = '__nova_sub__'/g, `const NOVA_DIVISAO = '__nova__'`);

// 3. States basic
content = content.replace(
  /const \[categoriaId, setCategoriaId\] = useState<string>\(''\)\n  const \[subcategoriaId, setSubcategoriaId\] = useState<string>\(''\)\n  const \[tipoClassificacao, setTipoClassificacao\] = useState<TipoClassificacaoMaterial>\('consumivel'\)\n  const \[novaCategoriaNome, setNovaCategoriaNome\] = useState\(''\)\n  const \[novaSubcategoriaNome, setNovaSubcategoriaNome\] = useState\(''\)/,
  `const [divisaoId, setDivisaoId] = useState<string>('pre_consumivel')
  const [novaDivisaoNome, setNovaDivisaoNome] = useState('')`
);

// 4. States compra
content = content.replace(
  /const \[compraNovoCategoriaId, setCompraNovoCategoriaId\] = useState\(''\)\n  const \[compraNovoSubcategoriaId, setCompraNovoSubcategoriaId\] = useState\(''\)\n  const \[compraNovaCategoriaNome, setCompraNovaCategoriaNome\] = useState\(''\)\n  const \[compraNovaSubcategoriaNome, setCompraNovaSubcategoriaNome\] = useState\(''\)/,
  `const [compraNovoDivisaoId, setCompraNovoDivisaoId] = useState('pre_consumivel')
  const [compraNovaDivisaoNome, setCompraNovaDivisaoNome] = useState('')`
);

// 5. limparFormulario
content = content.replace(
  /setCategoriaId\(''\)\n    setSubcategoriaId\(''\)\n    setTipoClassificacao\('consumivel'\)\n    setNovaCategoriaNome\(''\)\n    setNovaSubcategoriaNome\(''\)/,
  `setDivisaoId('pre_consumivel')
    setNovaDivisaoNome('')`
);

// 6. limparFormularioCompra
content = content.replace(
  /setCompraNovoCategoriaId\(''\)\n    setCompraNovoSubcategoriaId\(''\)\n    setCompraNovaCategoriaNome\(''\)\n    setCompraNovaSubcategoriaNome\(''\)/,
  `setCompraNovoDivisaoId('pre_consumivel')
    setCompraNovaDivisaoNome('')`
);

// 7. iniciarEdicao
content = content.replace(
  /setCategoriaId\(String\(material\.categoriaId\)\)\n    setSubcategoriaId\(material\.subcategoriaId \? String\(material\.subcategoriaId\) : ''\)\n    setTipoClassificacao\(obterClassificacaoMaterial\(material, categorias\)\)\n    setNovaCategoriaNome\(''\)\n    setNovaSubcategoriaNome\(''\)/,
  `if (material.categoriaId) {
      const cat = categorias.find((c) => c.id === material.categoriaId)
      if (cat && cat.nome !== 'Geral') {
        setDivisaoId('cat_' + cat.id)
      } else if (material.tipoClassificacao) {
        setDivisaoId('pre_' + material.tipoClassificacao)
      } else {
        setDivisaoId('pre_consumivel')
      }
    } else {
      setDivisaoId('pre_consumivel')
    }
    setNovaDivisaoNome('')`
);

// 8. handleSubmit logic
const handleSubmitRegex = /let categoriaIdFinal: number \| undefined[\s\S]*?if \(materialEmEdicaoId !== null\) {/;
content = content.replace(handleSubmitRegex, `let categoriaIdFinal: number | undefined
      let tipoClassificacaoFinal: TipoClassificacaoMaterial | undefined

      if (divisaoId === NOVA_DIVISAO) {
        if (!novaDivisaoNome.trim()) {
          setErro('Informe o nome da nova divisão')
          return
        }
        categoriaIdFinal = await criarCategoriaMaterial(novaDivisaoNome.trim())
      } else if (divisaoId.startsWith('pre_')) {
        tipoClassificacaoFinal = divisaoId.replace('pre_', '') as TipoClassificacaoMaterial
        categoriaIdFinal = categorias.find((c) => c.nome === 'Geral')?.id
        if (!categoriaIdFinal) categoriaIdFinal = await criarCategoriaMaterial('Geral')
      } else if (divisaoId.startsWith('cat_')) {
        categoriaIdFinal = Number(divisaoId.replace('cat_', ''))
      } else {
        categoriaIdFinal = categorias.find((c) => c.nome === 'Geral')?.id ?? (await criarCategoriaMaterial('Geral'))
      }

      if (materialEmEdicaoId !== null) {`);

// 9. handleSubmit save object
content = content.replace(
  /categoriaId: categoriaIdFinal,\n          subcategoriaId: subcategoriaIdFinal,\n          tipoClassificacao,/g,
  `categoriaId: categoriaIdFinal,
          tipoClassificacao: tipoClassificacaoFinal,`
);
content = content.replace(
  /categoriaId: categoriaIdFinal,\n          subcategoriaId: subcategoriaIdFinal,\n          tipoClassificacao\n        }\)/,
  `categoriaId: categoriaIdFinal,
          tipoClassificacao: tipoClassificacaoFinal
        })`
);

// 10. handleRegistrarCompra logic
const handleRegistrarCompraRegex = /let catIdFinal: number \| undefined[\s\S]*?await registrarCompraMaterial\(\{/;
content = content.replace(handleRegistrarCompraRegex, `let catIdFinal: number | undefined
        let tipoClassificacaoFinal: TipoClassificacaoMaterial | undefined

        if (compraNovoDivisaoId === NOVA_DIVISAO) {
          if (!compraNovaDivisaoNome.trim()) {
            setErroCompra('Informe o nome da nova divisão.')
            return
          }
          catIdFinal = await criarCategoriaMaterial(compraNovaDivisaoNome.trim())
        } else if (compraNovoDivisaoId.startsWith('pre_')) {
          tipoClassificacaoFinal = compraNovoDivisaoId.replace('pre_', '') as TipoClassificacaoMaterial
          catIdFinal = categorias.find((c) => c.nome === 'Geral')?.id
          if (!catIdFinal) catIdFinal = await criarCategoriaMaterial('Geral')
        } else if (compraNovoDivisaoId.startsWith('cat_')) {
          catIdFinal = Number(compraNovoDivisaoId.replace('cat_', ''))
        } else {
          catIdFinal = categorias.find((c) => c.nome === 'Geral')?.id ?? (await criarCategoriaMaterial('Geral'))
        }

        await registrarCompraMaterial({`);

// 11. handleRegistrarCompra save object
content = content.replace(
  /categoriaId: catIdFinal,\n            subcategoriaId: subcatIdFinal,/g,
  `categoriaId: catIdFinal,
            tipoClassificacao: tipoClassificacaoFinal,`
);


// RENDER: Replace form fields for the first form
const formDropdownRegex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">[\s\S]*?<\/div>\s*\{categoriaId === NOVA_CATEGORIA[\s\S]*?\}\)\}/;

content = content.replace(formDropdownRegex, `<div className="flex flex-col gap-1">
                        <label htmlFor="divisao-material" className="text-sm font-medium text-on-surface">
                          Divisão / Tipo
                        </label>
                        <select
                          id="divisao-material"
                          value={divisaoId}
                          onChange={(e) => setDivisaoId(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <optgroup label="Divisões Padrão">
                            <option value="pre_consumivel">🧪 Insumo / Consumível (resinas, silicones, enfeites)</option>
                            <option value="pre_ferramenta">🛠️ Ferramenta / Equipamento (estufa, incubadora, politriz)</option>
                            <option value="pre_administrativo">📦 Administrativo / Embalagem (papel, etiquetas, caixas)</option>
                            <option value="pre_epi">🥽 EPI / Proteção (luvas, máscara, touca, refil)</option>
                          </optgroup>
                          <optgroup label="Divisões Customizadas">
                            {categorias.filter(c => c.nome !== 'Geral').map(c => (
                              <option key={c.id} value={'cat_' + c.id}>{c.nome}</option>
                            ))}
                          </optgroup>
                          <option value={NOVA_DIVISAO}>+ Nova Divisão</option>
                        </select>
                      </div>

                    {divisaoId === NOVA_DIVISAO && (
                      <TextField
                        id="nova-divisao-material"
                        rotulo="Nome da nova divisão"
                        value={novaDivisaoNome}
                        onChange={(e) => setNovaDivisaoNome(e.target.value)}
                      />
                    )}`);


// RENDER: Replace form fields for the second form (compra)
const formDropdownCompraRegex = /<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">[\s\S]*?<\/div>\s*\{compraNovoCategoriaId === NOVA_CATEGORIA[\s\S]*?\}\)\}/;

content = content.replace(formDropdownCompraRegex, `<div className="flex flex-col gap-1">
                          <label htmlFor="compra-novo-divisao" className="text-sm font-medium text-on-surface">
                            Divisão / Tipo
                          </label>
                          <select
                            id="compra-novo-divisao"
                            value={compraNovoDivisaoId}
                            onChange={(e) => setCompraNovoDivisaoId(e.target.value)}
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <optgroup label="Divisões Padrão">
                              <option value="pre_consumivel">🧪 Insumo / Consumível</option>
                              <option value="pre_ferramenta">🛠️ Ferramenta / Equipamento</option>
                              <option value="pre_administrativo">📦 Administrativo / Embalagem</option>
                              <option value="pre_epi">🥽 EPI / Proteção</option>
                            </optgroup>
                            <optgroup label="Divisões Customizadas">
                              {categorias.filter(c => c.nome !== 'Geral').map(c => (
                                <option key={c.id} value={'cat_' + c.id}>{c.nome}</option>
                              ))}
                            </optgroup>
                            <option value={NOVA_DIVISAO}>+ Nova Divisão</option>
                          </select>
                        </div>

                      {compraNovoDivisaoId === NOVA_DIVISAO && (
                        <TextField
                          id="compra-nova-divisao-nome"
                          rotulo="Nome da nova divisão"
                          value={compraNovaDivisaoNome}
                          onChange={(e) => setCompraNovaDivisaoNome(e.target.value)}
                        />
                      )}`);

// Render: Tabs
const tabsRegex = /\{DIVISOES_ESTOQUE\.map\(\(div\) => \{[\s\S]*?\}\)\}/;

content = content.replace(tabsRegex, `{(() => {
                      const categoriasCustomizadas = categorias.filter(c => c.nome !== 'Geral');
                      const TODAS_AS_DIVISOES = [
                        ...DIVISOES_PADRAO,
                        ...categoriasCustomizadas.map(c => ({ id: 'cat_' + c.id, rotulo: c.nome, icone: '📁' }))
                      ];

                      return TODAS_AS_DIVISOES.map((div) => {
                        const ativa = subAbaClassificacao === div.id
                        const qtd =
                          div.id === 'todos'
                            ? materiais.length
                            : materiais.filter((m) => {
                                const classif = m.categoriaId 
                                  ? (categorias.find(c => c.id === m.categoriaId)?.nome !== 'Geral' ? 'cat_' + m.categoriaId : m.tipoClassificacao || 'consumivel')
                                  : m.tipoClassificacao || 'consumivel';
                                return classif === div.id;
                              }).length

                        return (
                          <button
                            key={div.id}
                            type="button"
                            onClick={() => setSubAbaClassificacao(div.id)}
                            className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer \${
                              ativa
                                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                            }\`}
                          >
                            <span>{div.icone}</span>
                            <span>{div.rotulo}</span>
                            <span
                              className={\`px-1.5 py-0.2 rounded-full text-[10px] font-bold \${
                                ativa ? 'bg-on-primary/20 text-on-primary' : 'bg-outline-variant/40 text-on-surface'
                              }\`}
                            >
                              {qtd}
                            </span>
                          </button>
                        )
                      })
                    })()}`);

// Fixing obtaining filtered material and title for empty state.
content = content.replace(/subAbaClassificacao === 'todos'\n[\s]*\? materiais\n[\s]*: materiais\.filter\(\(m\) => obterClassificacaoMaterial\(m, categorias\) === subAbaClassificacao\)/, `subAbaClassificacao === 'todos'
                        ? materiais
                        : materiais.filter((m) => {
                            const classif = m.categoriaId 
                                  ? (categorias.find(c => c.id === m.categoriaId)?.nome !== 'Geral' ? 'cat_' + m.categoriaId : m.tipoClassificacao || 'consumivel')
                                  : m.tipoClassificacao || 'consumivel';
                            return classif === subAbaClassificacao
                          })`);

content = content.replace(/DIVISOES_ESTOQUE\.find\(\(d\) => d\.id === subAbaClassificacao\)\?\.rotulo/, `[...DIVISOES_PADRAO, ...categorias.filter(c => c.nome !== 'Geral').map(c => ({ id: 'cat_' + c.id, rotulo: c.nome }))].find((d) => d.id === subAbaClassificacao)?.rotulo`);


// Final Write
fs.writeFileSync(path, content, 'utf8');
console.log('Script concluded successfully');
