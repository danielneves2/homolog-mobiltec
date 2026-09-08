/**
 * O rail roxo dos grupos.
 *
 * Sem filtro ele é o de sempre, com o nome do grupo na vertical. Com filtro de
 * itens some por completo — sobram 1–2 linhas por grupo, o rótulo girado não
 * cabe na altura da célula e vazava por cima dos grupos vizinhos.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

/** Mede cada rail: o rótulo cabe dentro da célula? algum invade o vizinho? */
const medirRails = () =>
  p.evaluate(() => {
    const rails = [...document.querySelectorAll('tbody > tr > td[rowspan]')]
    const caixas = rails.map((td) => {
      const span = td.querySelector('span')
      const c = td.getBoundingClientRect()
      const s = span.getBoundingClientRect()
      return {
        rotulo: span.textContent.trim(),
        completo: span.getAttribute('title'),
        vazaEmPx: Math.round(Math.max(0, s.height - c.height)),
        // scrollHeight = altura natural do texto; clientHeight = o que cabe
        cortado: span.scrollHeight > span.clientHeight + 1,
        topo: s.top,
        base: s.bottom,
      }
    })
    // Sobreposição entre rótulos de grupos diferentes
    let sobrepostos = 0
    for (let i = 1; i < caixas.length; i++) {
      if (caixas[i].topo < caixas[i - 1].base - 1) sobrepostos++
    }
    return { quantidade: caixas.length, caixas, sobrepostos }
  })

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(600)

  // 1. Sem filtro: o rail é o de sempre, com o texto na vertical
  const semFiltro = await medirRails()
  console.log(`1. Sem filtro: ${semFiltro.quantidade} rail(s), ${semFiltro.sobrepostos} sobreposto(s)`)
  if (semFiltro.quantidade === 0) erros.push('Rail sumiu na visão sem filtro')
  const escrita = await p
    .locator('tbody > tr > td[rowspan] span')
    .first()
    .evaluate((el) => getComputedStyle(el).writingMode)
  console.log(`   writing-mode: ${escrita}`)
  if (!escrita.startsWith('vertical')) erros.push(`Rail perdeu a escrita vertical: ${escrita}`)
  await p.screenshot({ path: `${SAIDA}/43-rail-sem-filtro.png` })

  // 2. Com o filtro de itens ligado, o rail some por completo.
  // O recorte é acionado pelo painel de divergências — não há mais seletor.
  for (const [rotulo, arquivo] of [['Sem justificativa', '45-rail-sem-justificativa.png']]) {
    await p.locator('[data-painel-divergencias]').click()
    await p.locator('button:has-text("filtrar para resolver")').click()
    await p.waitForTimeout(800)

    const m = await medirRails()
    const linhas = await p.locator('tbody tr').count()
    console.log(`2. "${rotulo}": ${linhas} linha(s) | ${m.quantidade} rail(s) — esperado 0`)
    if (m.quantidade !== 0) {
      erros.push(`"${rotulo}": o rail deveria sumir, achei ${m.quantidade}`)
    }
    // Sem o rail, a coluna de item tem de encostar na borda esquerda
    const recuo = await p
      .locator('tbody th')
      .first()
      .evaluate((el) => getComputedStyle(el).left)
    console.log(`   recuo da coluna de itens: ${recuo}`)
    if (recuo !== '0px') erros.push(`"${rotulo}": coluna de itens ficou recuada em ${recuo}`)

    await p.screenshot({ path: `${SAIDA}/${arquivo}` })
  }
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-rail.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
