/** Verifica upload de foto (que entra no certificado) e abertura de reteste. */
import { chromium } from 'playwright'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

// PNG 4x4 laranja sólido, gerado aqui para não depender de asset externo
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAHElEQVQIW2P8z8Dwn4EIwDiqkL4hRYIYGGmvEACs1QcVLDzeYAAAAABJRU5ErkJggg==',
  'base64',
)
const dirTmp = mkdtempSync(path.join(tmpdir(), 'foto-'))
const arquivoFoto = path.join(dirTmp, 'dispositivo.png')
writeFileSync(arquivoFoto, PNG)

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login')
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })

  const cabecalhos = await p.locator('thead tr').first().locator('th[data-modelo]').all()
  const nomes = await Promise.all(cabecalhos.map((h) => h.getAttribute('data-modelo')))
  const alvo = nomes.find((n) => n.includes('Positivo')) ?? nomes[0]
  const iColuna = nomes.indexOf(alvo)
  console.log(`Coluna alvo: "${alvo}" (índice ${iColuna})`)

  // --- 1. Upload da foto ---
  const linhaFoto = p.locator('thead tr').filter({ hasText: 'Foto' }).first()
  const antes = await linhaFoto.locator('td').nth(iColuna).textContent()
  console.log(`1. Célula da foto antes: "${antes.trim()}"`)

  await linhaFoto.locator('td').nth(iColuna).locator('input[type=file]').setInputFiles(arquivoFoto)
  await p.waitForTimeout(2500)

  const temImagem = await linhaFoto.locator('td').nth(iColuna).locator('img').count()
  console.log(`2. Miniatura apareceu na matriz: ${temImagem > 0}`)
  if (temImagem === 0) erros.push('A foto não apareceu na matriz')

  await p.screenshot({ path: `${SAIDA}/15-matriz-com-foto.png` })

  // --- 2. A foto tem que entrar no certificado ---
  const idHomologacao = await p
    .locator(`thead th[data-modelo="${alvo}"] a[href*="/certificado"]`)
    .getAttribute('href')
  await p.goto(`http://localhost:8080${idHomologacao}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('iframe[title="Preview do certificado"]')
  await p.waitForTimeout(2500)

  const frame = p.frameLocator('iframe[title="Preview do certificado"]')
  const estiloFoto = await frame.locator('.ficha-foto').getAttribute('style')
  const inlinada = !!estiloFoto && estiloFoto.includes('data:image/')
  console.log(`3. Foto embutida no certificado como data URI: ${inlinada}`)
  if (!inlinada) erros.push('A foto não foi embutida no certificado')

  await frame.locator('.pagina').first().screenshot({ path: `${SAIDA}/16-certificado-com-foto.png` })

  // --- 3. Reteste ---
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  const versaoAntes = await p
    .locator('thead tr')
    .filter({ hasText: 'Versão do Agente' })
    .first()
    .locator('td')
    .nth(iColuna)
    .textContent()
  console.log(`4. Versão do agente antes: ${versaoAntes.trim()}`)

  await p.locator(`thead th[data-modelo="${alvo}"] button:has-text("reteste")`).click()
  await p.waitForSelector('text=Abrir reteste')
  console.log('5. Modal de reteste abriu')
  await p.screenshot({ path: `${SAIDA}/17-modal-reteste.png` })

  // Versão única por execução: com valor fixo, a checagem passaria à toa
  // na segunda rodada, quando a versão anterior já é a mesma.
  const novaVersao = `99.${Date.now().toString().slice(-5)}`
  await p.locator('input[placeholder="ex.: 12.7.0"]').fill(novaVersao)
  await p.click('button:has-text("Abrir reteste")')
  await p.waitForTimeout(2500)

  const versaoDepois = await p
    .locator('thead tr')
    .filter({ hasText: 'Versão do Agente' })
    .first()
    .locator('td')
    .nth(iColuna)
    .textContent()
  console.log(`6. Versão do agente depois: ${versaoDepois.trim()} (esperado ${novaVersao})`)
  if (!versaoDepois.includes(novaVersao)) erros.push('A coluna não passou a mostrar o reteste')

  const historico = await p.locator(`thead th[data-modelo="${alvo}"]`).textContent()
  // Rótulo do cabeçalho: "3ª homologação" quando há retestes anteriores
  const temHistorico = /\d+ª homologação/.test(historico)
  console.log(`7. Homologação anterior virou histórico: ${temHistorico}`)
  if (!temHistorico) erros.push('A homologação anterior não aparece como histórico')

  // O reteste nasce zerado
  const naoTestados = await p
    .locator('tbody tr')
    .first()
    .locator('td button[data-status]')
    .nth(iColuna)
    .getAttribute('data-status')
  console.log(`8. Primeiro item do reteste: ${naoTestados} (esperado NAO_TESTADO)`)
  if (naoTestados !== 'NAO_TESTADO') erros.push(`Reteste não nasceu zerado: ${naoTestados}`)

  await p.screenshot({ path: `${SAIDA}/18-matriz-pos-reteste.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-foto-reteste.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
