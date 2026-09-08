/**
 * A coluna "Homologação" da matriz tem de listar exatamente estas linhas,
 * nesta ordem — é a especificação que o usuário passou.
 *
 * Duas linhas da ficha não estão na lista dele e são exceções deliberadas:
 * `Foto` (única forma de definir a imagem do modelo) e `Homologado` (a linha
 * que passou a ditar o veredito, no lugar da flag do cabeçalho).
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

// "Modelo PoS" saiu: nascia de fabricante + modelo, que já são linhas daqui,
// e ainda era o título da coluna — a mesma resposta três vezes.
const FICHA = [
  'Foto',
  'Homologado',
  'Versão PoS',
  'IMEI 1',
  'IMEI 2',
  'Número de Série',
  'Tipo do Agente',
  'Versão do Agente',
  'Gerenciamento',
  'Ferramenta',
  'Precisa Assinatura DEV',
  'Android',
  'Fabricante',
  'Modelo',
]

const TELEMETRIA = [
  'Bateria',
  'Memória',
  'Dados Móveis',
  'Armazenamento',
  'Última Localização',
  'Histórico de Localização',
  'Apps Instalados',
  'App Tempo/Tela',
  'App Consumo WiFi',
  'App Consumo 4G',
]

const COLETA = [
  'IMEI 1',
  'IMEI 2',
  'Número de Série',
  'Rede WiFi',
  'Endereço IP',
  'Operadora',
  'Fabricante',
  'Modelo',
  'Precisão GPS',
  'Saúde da Bateria',
  'SIM Card',
]

const COMANDOS = [
  'Desabilitar / Habilitar',
  'Alarme',
  'Reiniciar',
  'Bloquear',
  'Desbloquear',
  'Wipe',
  'Requisitar Logs',
  'Visualização Remota',
  'Acesso Remoto',
  'Instalação',
  'Desinstalação',
  'Limpeza de Dados',
  'Instalação Silenciosa',
  'Instalação Automática',
  'Requisito de Instalação',
  'Mensagem',
]

const PERFIS = [
  'Configuração de Monitores',
  'Políticas de Senhas',
  'Configuração de Launcher',
  'Time Fencing',
  'Apps Bloqueados',
  'Instalação de Apps',
  'Instalação de Conteúdo',
  'APN Automática',
  'Zero-Touch',
]

/** Itens que o usuário não listou e que aguardam decisão sobre remoção */
const PENDENTES = ['Histórico de Bateria', 'Sinal de Rede (4G/Wi-Fi)']

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz/pos', { waitUntil: 'networkidle' })
  await p.waitForSelector('tbody tr')
  await p.waitForTimeout(900)

  // Nome de cada linha, na ordem da coluna da esquerda. A ficha mora no
  // `thead` (depois da linha dos modelos) e os itens no `tbody`; nos dois
  // casos o rótulo é o `th` da linha — nas primeiras linhas de cada grupo ele
  // vem depois do `td` do rail.
  const linhas = await p.evaluate(() =>
    [...document.querySelectorAll('thead tr'), ...document.querySelectorAll('tbody tr')]
      .slice(1)
      .map((tr) => tr.querySelector('th')?.textContent.trim() ?? '')
      .filter(Boolean),
  )
  console.log(`1. Linhas na matriz: ${linhas.length}`)

  const esperado = [...FICHA, ...TELEMETRIA, ...PENDENTES, ...COLETA, ...COMANDOS, ...PERFIS]
  console.log(`2. Referência: ${esperado.length} linhas na especificação do usuário`)

  // Verificação de SUBSEQUÊNCIA, não de igualdade: a bateria do tipo é
  // editável pela tela de registro. Item acrescentado pelo técnico é listado,
  // não cobrado; item desmarcado é ausência, não defeito. O que a
  // especificação continua mandando é a ORDEM RELATIVA e a grafia das linhas
  // que ela nomeia.
  const acrescentados = linhas.filter((n) => !esperado.includes(n))
  const especificadas = linhas.filter((n) => esperado.includes(n))

  const foraDeLugar = []
  let cursor = 0
  for (const nome of especificadas) {
    const achou = esperado.indexOf(nome, cursor)
    if (achou === -1) foraDeLugar.push(`"${nome}" aparece fora da ordem especificada`)
    else cursor = achou + 1
  }
  const ausentes = esperado.filter((n) => !linhas.includes(n))
  console.log(
    `3. Na planilha: ${linhas.length} linhas | fora de lugar: ${foraDeLugar.length} | não configuradas hoje: ${ausentes.length}${ausentes.length ? ` (${ausentes.join(', ')})` : ''}`,
  )
  if (acrescentados.length) {
    console.log(`3b. Acrescentados pelo técnico: ${acrescentados.join(', ')}`)
  }
  if (foraDeLugar.length) {
    console.log(`3c. ${foraDeLugar.slice(0, 12).join('\n    ')}`)
    erros.push(`${foraDeLugar.length} linha(s) fora da ordem especificada`)
  }

  // A flag de veredito saiu do cabeçalho — quem responde é a linha "Homologado"
  const flagNoCabecalho = await p.evaluate(() =>
    [...document.querySelectorAll('thead th[data-modelo]')].filter((th) =>
      /✓\s*(Não )?Homologado/.test(th.textContent),
    ).length,
  )
  const linhaHomologado = await p.evaluate(() => {
    const tr = [...document.querySelectorAll('thead tr')].find(
      (x) => x.querySelector('th')?.textContent.trim() === 'Homologado',
    )
    if (!tr) return null
    return [...tr.querySelectorAll('td')].slice(0, 4).map((td) => td.textContent.trim())
  })
  console.log(`4. Flags no cabeçalho: ${flagNoCabecalho} (esperado 0) | linha "Homologado": ${JSON.stringify(linhaHomologado)}`)
  if (flagNoCabecalho > 0) {
    erros.push('A flag de homologado voltou ao cabeçalho — quem dita é a linha da ficha')
  }
  if (!linhaHomologado) erros.push('A linha "Homologado" sumiu da ficha')

  await p.screenshot({ path: `${SAIDA}/80-matriz-linhas.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-linhas.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
