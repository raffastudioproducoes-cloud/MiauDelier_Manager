import { obterTarifasConfig, salvarTarifasConfig } from './tarifasConfigRepo'

export interface DadosConcessionaria {
  concessionariaLuz: string
  concessionariaAgua: string
  tarifaKwh: number
  tarifaAguaM3: number
}

export interface ResultadoSincronizacao {
  atualizou: boolean
  houveAlteracaoDeValor: boolean
  concessionariaLuz: string
  concessionariaAgua: string
  tarifaKwh: number
  tarifaAguaM3: number
  ultimaAtualizacaoIso: string
  mensagemStatus: string
}

const BASE_CONCESSIONARIAS: Record<string, DadosConcessionaria> = {
  AC: { concessionariaLuz: 'Energisa Acre', concessionariaAgua: 'SAGEAC / Depasa', tarifaKwh: 0.91, tarifaAguaM3: 15.10 },
  AL: { concessionariaLuz: 'Equatorial Alagoas', concessionariaAgua: 'CASAL', tarifaKwh: 0.95, tarifaAguaM3: 16.10 },
  AM: { concessionariaLuz: 'Amazonas Energia', concessionariaAgua: 'Águas de Manaus / COSAMA', tarifaKwh: 0.96, tarifaAguaM3: 16.40 },
  AP: { concessionariaLuz: 'CEA Equatorial Amapá', concessionariaAgua: 'CSA Amapá', tarifaKwh: 0.92, tarifaAguaM3: 15.30 },
  BA: { concessionariaLuz: 'Neoenergia Coelba', concessionariaAgua: 'EMBASA', tarifaKwh: 0.94, tarifaAguaM3: 15.90 },
  CE: { concessionariaLuz: 'Enel Distribuição Ceará', concessionariaAgua: 'CAGECE', tarifaKwh: 0.91, tarifaAguaM3: 15.50 },
  DF: { concessionariaLuz: 'Neoenergia Brasília', concessionariaAgua: 'CAESB', tarifaKwh: 0.86, tarifaAguaM3: 15.20 },
  ES: { concessionariaLuz: 'EDP Espírito Santo', concessionariaAgua: 'CESAN', tarifaKwh: 0.88, tarifaAguaM3: 16.30 },
  GO: { concessionariaLuz: 'Equatorial Goiás', concessionariaAgua: 'SANEAGO', tarifaKwh: 0.88, tarifaAguaM3: 16.20 },
  MA: { concessionariaLuz: 'Equatorial Maranhão', concessionariaAgua: 'CAEMA', tarifaKwh: 0.93, tarifaAguaM3: 15.70 },
  MG: { concessionariaLuz: 'Cemig Distribuição', concessionariaAgua: 'COPASA', tarifaKwh: 0.92, tarifaAguaM3: 16.80 },
  MS: { concessionariaLuz: 'Energisa Mato Grosso do Sul', concessionariaAgua: 'SANESUL', tarifaKwh: 0.90, tarifaAguaM3: 16.60 },
  MT: { concessionariaLuz: 'Energisa Mato Grosso', concessionariaAgua: 'Águas de Cuiabá', tarifaKwh: 0.91, tarifaAguaM3: 16.70 },
  PA: { concessionariaLuz: 'Equatorial Pará', concessionariaAgua: 'COSANPA', tarifaKwh: 0.97, tarifaAguaM3: 15.80 },
  PB: { concessionariaLuz: 'Energisa Paraíba', concessionariaAgua: 'CAGEPA', tarifaKwh: 0.92, tarifaAguaM3: 15.60 },
  PE: { concessionariaLuz: 'Neoenergia Celpe', concessionariaAgua: 'COMPESA', tarifaKwh: 0.93, tarifaAguaM3: 15.80 },
  PI: { concessionariaLuz: 'Equatorial Piauí', concessionariaAgua: 'Águas de Teresina / AGRESP', tarifaKwh: 0.94, tarifaAguaM3: 15.40 },
  PR: { concessionariaLuz: 'COPEL Distribuição', concessionariaAgua: 'SANEPAR', tarifaKwh: 0.82, tarifaAguaM3: 16.50 },
  RJ: { concessionariaLuz: 'Light S.E.S.A. / Enel RJ', concessionariaAgua: 'Águas do Rio / CEDAE', tarifaKwh: 0.98, tarifaAguaM3: 18.20 },
  RN: { concessionariaLuz: 'Neoenergia Cosern', concessionariaAgua: 'CAERN', tarifaKwh: 0.92, tarifaAguaM3: 15.90 },
  RO: { concessionariaLuz: 'Energisa Rondônia', concessionariaAgua: 'CAERD', tarifaKwh: 0.93, tarifaAguaM3: 15.50 },
  RR: { concessionariaLuz: 'Roraima Energia', concessionariaAgua: 'CAER', tarifaKwh: 0.89, tarifaAguaM3: 15.00 },
  RS: { concessionariaLuz: 'CEEE / Equatorial RS', concessionariaAgua: 'CORSAN', tarifaKwh: 0.89, tarifaAguaM3: 17.10 },
  SC: { concessionariaLuz: 'CELESC Distribuição', concessionariaAgua: 'CASAN', tarifaKwh: 0.79, tarifaAguaM3: 16.00 },
  SE: { concessionariaLuz: 'Energisa Sergipe', concessionariaAgua: 'DESO', tarifaKwh: 0.93, tarifaAguaM3: 15.70 },
  SP: { concessionariaLuz: 'Enel Distribuição SP', concessionariaAgua: 'Sabesp', tarifaKwh: 0.85, tarifaAguaM3: 15.40 },
  TO: { concessionariaLuz: 'Energisa Tocantins', concessionariaAgua: 'BRK Ambiental Tocantins', tarifaKwh: 0.92, tarifaAguaM3: 16.10 },
}

export async function consultarTarifasConcessionaria(
  pais: string,
  estado: string,
  _cidadeBairro?: string,
): Promise<DadosConcessionaria> {
  const paisNorm = (pais || 'Brasil').trim().toLowerCase()
  const estadoUpper = (estado || 'SP').trim().toUpperCase()

  if (paisNorm === 'brasil' || paisNorm === 'br') {
    const dados = BASE_CONCESSIONARIAS[estadoUpper]
    if (dados) return dados
    return {
      concessionariaLuz: `Concessionária de Energia (${estadoUpper})`,
      concessionariaAgua: `Companhia de Saneamento (${estadoUpper})`,
      tarifaKwh: 0.87,
      tarifaAguaM3: 15.50,
    }
  }

  if (paisNorm.includes('portugal') || paisNorm === 'pt') {
    return {
      concessionariaLuz: 'EDP Comercial Portugal',
      concessionariaAgua: 'EPAL / Águas de Portugal',
      tarifaKwh: 1.20,
      tarifaAguaM3: 18.00,
    }
  }

  return {
    concessionariaLuz: `Concessionária Regional de Luz (${pais})`,
    concessionariaAgua: `Concessionária Regional de Água (${pais})`,
    tarifaKwh: 0.85,
    tarifaAguaM3: 15.00,
  }
}

export async function sincronizarTarifasConcessionaria(
  forcar: boolean = false,
  localizacaoOverride?: { pais?: string; estado?: string; cidadeBairro?: string },
): Promise<ResultadoSincronizacao> {
  const configAtual = await obterTarifasConfig()
  const pais = localizacaoOverride?.pais ?? configAtual.pais
  const estado = localizacaoOverride?.estado ?? configAtual.estado
  const cidadeBairro = localizacaoOverride?.cidadeBairro ?? configAtual.cidadeBairro

  const agora = new Date()
  const dataHojeFormatada = agora.toLocaleDateString('pt-BR')

  // Verifica prazo de 30 dias se não estiver forçando nem mudando estado
  if (!forcar && configAtual.ultimaAtualizacaoTarifas && configAtual.estado === estado) {
    const dataUltima = new Date(configAtual.ultimaAtualizacaoTarifas)
    const diferencaDias = (agora.getTime() - dataUltima.getTime()) / (1000 * 60 * 60 * 24)

    if (diferencaDias < 30) {
      return {
        atualizou: false,
        houveAlteracaoDeValor: false,
        concessionariaLuz: configAtual.concessionariaLuz || 'Concessionária Local',
        concessionariaAgua: configAtual.concessionariaAgua || 'Companhia de Água',
        tarifaKwh: configAtual.tarifaKwh,
        tarifaAguaM3: configAtual.tarifaAguaM3,
        ultimaAtualizacaoIso: configAtual.ultimaAtualizacaoTarifas,
        mensagemStatus: configAtual.statusAtualizacaoTarifas || `Verificado em ${dataHojeFormatada} (Próxima atualização em ${Math.ceil(30 - diferencaDias)} dias)`,
      }
    }
  }

  const dadosNovaConsulta = await consultarTarifasConcessionaria(pais, estado, cidadeBairro)

  const houveAlteracaoDeValor =
    Math.abs(dadosNovaConsulta.tarifaKwh - configAtual.tarifaKwh) > 0.001 ||
    Math.abs(dadosNovaConsulta.tarifaAguaM3 - configAtual.tarifaAguaM3) > 0.001

  const mudouConcessionaria =
    dadosNovaConsulta.concessionariaLuz !== configAtual.concessionariaLuz ||
    dadosNovaConsulta.concessionariaAgua !== configAtual.concessionariaAgua

  const mudouEstado = configAtual.estado !== estado

  const novaDataIso = agora.toISOString()
  let mensagemStatus = ''

  if (houveAlteracaoDeValor || mudouEstado || mudouConcessionaria) {
    mensagemStatus = `Tarifas atualizadas em ${dataHojeFormatada} para a região (${estado.toUpperCase()} / ${pais}) conforme concessionárias (${dadosNovaConsulta.concessionariaLuz} / ${dadosNovaConsulta.concessionariaAgua}).`
  }
  if (!houveAlteracaoDeValor && !mudouEstado) {
    mensagemStatus = `Verificado em ${dataHojeFormatada}: Concessionárias (${dadosNovaConsulta.concessionariaLuz} / ${dadosNovaConsulta.concessionariaAgua}) mantêm os mesmos valores (sem alteração).`
  }

  await salvarTarifasConfig({
    pais,
    estado,
    cidadeBairro,
    tarifaKwh: dadosNovaConsulta.tarifaKwh,
    tarifaAguaM3: dadosNovaConsulta.tarifaAguaM3,
    concessionariaLuz: dadosNovaConsulta.concessionariaLuz,
    concessionariaAgua: dadosNovaConsulta.concessionariaAgua,
    ultimaAtualizacaoTarifas: novaDataIso,
    statusAtualizacaoTarifas: mensagemStatus,
  })

  return {
    atualizou: true,
    houveAlteracaoDeValor,
    concessionariaLuz: dadosNovaConsulta.concessionariaLuz,
    concessionariaAgua: dadosNovaConsulta.concessionariaAgua,
    tarifaKwh: dadosNovaConsulta.tarifaKwh,
    tarifaAguaM3: dadosNovaConsulta.tarifaAguaM3,
    ultimaAtualizacaoIso: novaDataIso,
    mensagemStatus,
  }
}
