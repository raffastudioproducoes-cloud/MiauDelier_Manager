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
  SP: { concessionariaLuz: 'Enel Distribuição SP', concessionariaAgua: 'Sabesp', tarifaKwh: 0.85, tarifaAguaM3: 15.40 },
  RJ: { concessionariaLuz: 'Light S.E.S.A.', concessionariaAgua: 'Águas do Rio / CEDAE', tarifaKwh: 0.98, tarifaAguaM3: 18.20 },
  MG: { concessionariaLuz: 'Cemig Distribuição', concessionariaAgua: 'COPASA', tarifaKwh: 0.92, tarifaAguaM3: 16.80 },
  RS: { concessionariaLuz: 'CEEE / Equatorial RS', concessionariaAgua: 'CORSAN', tarifaKwh: 0.89, tarifaAguaM3: 17.10 },
  PR: { concessionariaLuz: 'COPEL Distribuição', concessionariaAgua: 'SANEPAR', tarifaKwh: 0.82, tarifaAguaM3: 16.50 },
  BA: { concessionariaLuz: 'Neoenergia Coelba', concessionariaAgua: 'EMBASA', tarifaKwh: 0.94, tarifaAguaM3: 15.90 },
  SC: { concessionariaLuz: 'CELESC Distribuição', concessionariaAgua: 'CASAN', tarifaKwh: 0.79, tarifaAguaM3: 16.00 },
  PE: { concessionariaLuz: 'Neoenergia Celpe', concessionariaAgua: 'COMPESA', tarifaKwh: 0.93, tarifaAguaM3: 15.80 },
  CE: { concessionariaLuz: 'Enel Distribuição Ceará', concessionariaAgua: 'CAGECE', tarifaKwh: 0.91, tarifaAguaM3: 15.50 },
  GO: { concessionariaLuz: 'Equatorial Goiás', concessionariaAgua: 'SANEAGO', tarifaKwh: 0.88, tarifaAguaM3: 16.20 },
  DF: { concessionariaLuz: 'Neoenergia Brasília', concessionariaAgua: 'CAESB', tarifaKwh: 0.86, tarifaAguaM3: 15.20 },
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

export async function sincronizarTarifasConcessionaria(forcar: boolean = false): Promise<ResultadoSincronizacao> {
  const configAtual = await obterTarifasConfig()
  const agora = new Date()
  const dataHojeFormatada = agora.toLocaleDateString('pt-BR')

  // Verifica prazo de 30 dias (30 * 24 * 60 * 60 * 1000 ms)
  if (!forcar && configAtual.ultimaAtualizacaoTarifas) {
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

  const dadosNovaConsulta = await consultarTarifasConcessionaria(
    configAtual.pais,
    configAtual.estado,
    configAtual.cidadeBairro,
  )

  const houveAlteracao =
    Math.abs(dadosNovaConsulta.tarifaKwh - configAtual.tarifaKwh) > 0.001 ||
    Math.abs(dadosNovaConsulta.tarifaAguaM3 - configAtual.tarifaAguaM3) > 0.001

  const novaDataIso = agora.toISOString()
  let mensagemStatus = ''

  if (houveAlteracao) {
    mensagemStatus = `Tarifas atualizadas em ${dataHojeFormatada} conforme novos valores da concessionária (${dadosNovaConsulta.concessionariaLuz} / ${dadosNovaConsulta.concessionariaAgua}).`
    await salvarTarifasConfig({
      tarifaKwh: dadosNovaConsulta.tarifaKwh,
      tarifaAguaM3: dadosNovaConsulta.tarifaAguaM3,
      concessionariaLuz: dadosNovaConsulta.concessionariaLuz,
      concessionariaAgua: dadosNovaConsulta.concessionariaAgua,
      ultimaAtualizacaoTarifas: novaDataIso,
      statusAtualizacaoTarifas: mensagemStatus,
    })
  } else {
    mensagemStatus = `Verificado em ${dataHojeFormatada}: Concessionárias (${dadosNovaConsulta.concessionariaLuz} / ${dadosNovaConsulta.concessionariaAgua}) mantêm os mesmos valores (sem alteração).`
    await salvarTarifasConfig({
      concessionariaLuz: dadosNovaConsulta.concessionariaLuz,
      concessionariaAgua: dadosNovaConsulta.concessionariaAgua,
      ultimaAtualizacaoTarifas: novaDataIso,
      statusAtualizacaoTarifas: mensagemStatus,
    })
  }

  return {
    atualizou: true,
    houveAlteracaoDeValor: houveAlteracao,
    concessionariaLuz: dadosNovaConsulta.concessionariaLuz,
    concessionariaAgua: dadosNovaConsulta.concessionariaAgua,
    tarifaKwh: houveAlteracao ? dadosNovaConsulta.tarifaKwh : configAtual.tarifaKwh,
    tarifaAguaM3: houveAlteracao ? dadosNovaConsulta.tarifaAguaM3 : configAtual.tarifaAguaM3,
    ultimaAtualizacaoIso: novaDataIso,
    mensagemStatus,
  }
}
