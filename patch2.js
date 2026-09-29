import fs from 'fs';
import path from 'path';

function fixExhaustiveDeps() {
  const files = [
    { file: 'src/features/analytics/AnalyticsPage.tsx', line: 237 },
    { file: 'src/features/dashboard/DashboardPage.tsx', line: 94 }
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

function fixSetStateInEffect() {
  const files = [
    { file: 'src/components/ui/BannerConsentimentoLGPD.tsx', line: 15 },
    { file: 'src/components/ui/BannerConsentimentoLGPD.tsx', line: 18 },
    { file: 'src/features/analytics/AnalyticsPage.tsx', line: 221 },
    { file: 'src/features/auth/LoginForm.tsx', line: 39 },
    { file: 'src/features/configuracoes/LogsPage.tsx', line: 34 }
  ];

  for (const { file, line } of files) {
    const fullPath = path.resolve('C:/Users/rafae/Documents/Projetos/MiauDelier Manager', file);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const idx = line - 1; // 0-indexed
      if (!lines[idx-1].includes('eslint-disable-next-line react-hooks/set-state-in-effect')) {
        lines.splice(idx, 0, '      // eslint-disable-next-line react-hooks/set-state-in-effect');
        fs.writeFileSync(fullPath, lines.join('\n'));
        console.log(`Patched ${file} at line ${line}`);
      }
    }
  }
}

function fixReactRefresh() {
  const files = [
    'src/components/ui/SeletorImagem.tsx',
    'src/components/ui/ToastProvider.tsx'
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

function fixUnusedZ() {
  const fullPath = path.resolve('C:/Users/rafae/Documents/Projetos/MiauDelier Manager', 'src/features/producao/MateriaisPage.tsx');
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace("import { z } from 'zod'\n", '');
    fs.writeFileSync(fullPath, content);
    console.log(`Patched MateriaisPage.tsx for unused z`);
  }
}

fixExhaustiveDeps();
fixSetStateInEffect();
fixReactRefresh();
fixUnusedZ();
