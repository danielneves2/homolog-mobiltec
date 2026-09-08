/**
 * O certificado não pode carregar identificador de unidade: S/N, IMEI 1 e
 * IMEI 2 saíram da ficha (e do nome do arquivo, que viaja junto com o PDF).
 *
 * A cobaia é escolhida entre as homologações que **têm** esses campos
 * preenchidos — num registro vazio, a ausência não provaria nada.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 900, height: 1200 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')

  // --- 1. Uma homologação com S/N e IMEI de verdade ---
  const cobaia = await p.evaluate(async () => {
    const t = localStorage.getItem('homolog.token')
    const h = { Authorization: `Bearer ${t}` }
    const { colunas } = await (await fetch('/api/matriz?categoriaSlug=pos', { headers: h })).json()
    const comImei = colunas
      .map((c) => c.homologacao)
      .filter((x) => x.numeroSerie && (x.imei1 || x.imei2))
    const escolhida = comImei[0] ?? colunas[0].homologacao
    return {
      id: escolhida.id,
      modelo: escolhida.dispositivo.modelo,
      numeroSerie: escolhida.numeroSerie,
      imei1: escolhida.imei1,
      imei2: escolhida.imei2,
      total: comImei.length,
    }
  })
  console.log(
    `1. Cobaia: ${cobaia.modelo} — S/N ${cobaia.numeroSerie}, IMEI ${cobaia.imei1} / ${cobaia.imei2} (${cobaia.total} candidatas)`,
  )
  if (!cobaia.numeroSerie) {
    erros.push('Nenhuma homologação tem S/N preenchido — o teste não provaria a remoção')
  }

  // --- 2. O HTML do certificado (é dele que sai o PDF) ---
  const html = await p.evaluate(async (id) => {
    const r = await fetch(`/api/homologacoes/${id}/certificado/preview`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    })
    return r.text()
  }, cobaia.id)

  // O nome do arquivo é lido agora, ainda na página do app: depois do
  // `setContent` a origem muda e o `fetch` relativo não alcança mais a API.
  const disposicao = await p.evaluate(async (id) => {
    const r = await fetch(`/api/homologacoes/${id}/certificado/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    })
    return r.headers.get('content-disposition')
  }, cobaia.id)

  await p.setContent(html, { waitUntil: 'networkidle' })

  // O VALOR não pode aparecer em lugar nenhum do documento
  const vazamentos = [
    ['S/N', cobaia.numeroSerie],
    ['IMEI 1', cobaia.imei1],
    ['IMEI 2', cobaia.imei2],
  ].filter(([, valor]) => valor && html.includes(valor))
  console.log(`2. Valores sensíveis no corpo do certificado: ${vazamentos.length}`)
  for (const [rotulo, valor] of vazamentos) {
    erros.push(`${rotulo} ainda aparece no certificado: ${valor}`)
  }

  // Já o RÓTULO só é proibido na ficha do dispositivo. "IMEI 1" e "Número de
  // Série" também são nomes de itens do grupo Coleta — a matriz registra se o
  // agente consegue coletá-los, sem mostrar o conteúdo. Essas linhas ficam.
  const rotulosNaFicha = await p.evaluate(() => {
    const ficha = document.querySelector('.ficha')?.textContent ?? ''
    return ['IMEI', 'Número de Série', 'S/N'].filter((r) => ficha.includes(r))
  })
  console.log(`3. Rótulos sensíveis na ficha do dispositivo: ${JSON.stringify(rotulosNaFicha)}`)
  if (rotulosNaFicha.length) {
    erros.push(`A ficha ainda tem os rótulos ${rotulosNaFicha.join(', ')}`)
  }

  // E os itens de Coleta continuam na matriz — tirá-los seria esconder um
  // resultado de teste, não um dado sensível.
  const itensDeColeta = await p.evaluate(() =>
    [...document.querySelectorAll('td')]
      .map((td) => td.textContent.trim())
      .filter((t) => /^(IMEI [12]|Número de Série)$/.test(t)),
  )
  console.log(`3b. Itens de Coleta na matriz: ${JSON.stringify(itensDeColeta)}`)
  if (itensDeColeta.length < 3) {
    erros.push(`A remoção levou junto os itens de teste de Coleta: ${JSON.stringify(itensDeColeta)}`)
  }

  // --- 4. O resto da ficha continua lá ---
  const obrigatorios = [
    'Fabricante',
    'Modelo',
    'Versão do SO',
    'Versão do Agente',
    'Método de Inscrição',
    'Data de Início',
  ]
  const sumiram = obrigatorios.filter((c) => !html.includes(c))
  console.log(`4. Campos que tinham de ficar: ${obrigatorios.length - sumiram.length}/${obrigatorios.length}`)
  if (sumiram.length) erros.push(`A remoção levou junto: ${sumiram.join(', ')}`)

  // --- 5. O nome do arquivo do PDF ---
  console.log(`5. Nome do PDF: ${disposicao}`)
  if (cobaia.numeroSerie && disposicao?.includes(cobaia.numeroSerie.replace(/[^\w.-]/g, '_'))) {
    erros.push('O S/N ainda está no nome do arquivo do PDF')
  }
  if (!disposicao?.includes(cobaia.modelo.replace(/[^\w.-]/g, '_'))) {
    erros.push(`O nome do arquivo perdeu o modelo: ${disposicao}`)
  }

  // --- 6. A ficha ainda renderiza inteira ---
  const ficha = await p.evaluate(() => ({
    linhas: [...document.querySelectorAll('.ficha-linha')].map((el) =>
      el.textContent.split(':')[0].trim(),
    ),
    paginas: document.querySelectorAll('.pagina').length,
  }))
  console.log(`6. Ficha (${ficha.paginas} páginas): ${JSON.stringify(ficha.linhas)}`)
  if (ficha.linhas.length !== 8) erros.push(`A ficha ficou com ${ficha.linhas.length} linhas, esperava 8`)
  if (ficha.paginas < 3) erros.push(`O certificado encolheu para ${ficha.paginas} páginas`)
  await p.locator('.pagina').first().screenshot({ path: `${SAIDA}/60-certificado-p1.png` })

  // --- 7. NAO_TESTADO continua fora do documento (spec §8.3) ---
  const texto = await p.locator('body').textContent()
  const vazouNaoTestado = /Não testado|NAO_TESTADO/.test(texto)
  console.log(`7. "Não testado" fora do certificado: ${!vazouNaoTestado}`)
  if (vazouNaoTestado) erros.push('Item não testado voltou a aparecer no certificado')
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-certificado-imei.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
