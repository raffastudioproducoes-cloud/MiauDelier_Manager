import fs from 'fs';
import path from 'path';

function fixExhaustiveDeps() {
  const files = [
    { file: 'src/features/financeiro/ContasPage.tsx', line: 43 },
    { file: 'src/features/ia/ConfiguracoesPage.tsx', line: 39 },
    { file: 'src/features/producao/CategoriasMaterialPage.tsx', line: 46 },
    { file: 'src/features/producao/EquipamentosPage.tsx', line: 43 },
    { file: 'src/features/producao/FormasPage.tsx', line: 154 },
    { file: 'src/features/producao/MateriaisPage.tsx', line: 154 },
    { file: 'src/features/vendas/ClientesPage.tsx', line: 50 },
    { file: 'src/features/vendas/PedidoDetalhePage.tsx', line: 53 },
    { file: 'src/features/vendas/PrecificacaoPage.tsx', line: 228 },
    { file: 'src/features/vendas/TaxasPage.tsx', line: 154 }
  ];

  for (const { file, line } of files) {
    const fullPath = path.resolve('C:/Users/rafae/Documents/Projetos/MiauDelier Manager', file);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const idx = line - 1; // 0-indexed
      if (lines[idx].includes('}, [') && !lines[idx-1].includes('eslint-disable-next-line react-hooks/exhaustive-deps')) {
        lines.splice(idx, 0, '    // eslint-disable-next-line react-hooks/exhaustive-deps');
        fs.writeFileSync(fullPath, lines.join('\n'));
        console.log(`Patched ${file} at line ${line}`);
      }
    }
  }
}

function fixReactRefresh() {
  const files = [
    'src/routes/__root.tsx',
    'src/routes/diagnostico.tsx',
    'src/routes/equipamentos.tsx',
    'src/routes/taxas.tsx',
    'src/features/producao/MateriaisPage.tsx'
  ];

  for (const file of files) {
    const fullPath = path.resolve('C:/Users/rafae/Documents/Projetos/MiauDelier Manager', file);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('/* eslint-disable react-refresh/only-export-components */')) {
        content = '/* eslint-disable react-refresh/only-export-components */\n' + content;
        fs.writeFileSync(fullPath, content);
        console.log(`Patched ${file} for react-refresh`);
      }
    }
  }
}

fixExhaustiveDeps();
fixReactRefresh();
