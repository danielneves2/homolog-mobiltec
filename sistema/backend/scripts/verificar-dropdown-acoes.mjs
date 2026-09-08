/** Dropdown por cima do card, ações numa linha só, e login sem logo no painel. */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  // --- Login sem a logo do painel roxo ---
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  const logos = await p.locator('img[alt="Mobiltec"]').count()
  console.log(`1. Logos na tela de login: ${logos} (esperado 1 — só a do cartão)`)
  if (logos !== 1) erros.push(`Esperava 1 logo no login, achei ${logos}`)
  await p.screenshot({ path: `${SAIDA}/40-login-sem-logo.png` })

  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(600)

  // --- Dropdown tem que ficar POR CIMA do conteúdo ---
  const botao = p.locator('button[aria-haspopup=listbox]').first()
  await botao.click()
  await p.waitForTimeout(400)

  const menu = p.locator('[role=listbox]')
  const visivel = await menu.isVisible()
  console.log(`2. Menu visível: ${visivel}`)
  if (!visivel) erros.push('Menu não ficou visível')

  const geo = await menu.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const botao = document
      .querySelector('button[aria-haspopup=listbox]')
      .getBoundingClientRect()
    // Quem está pintado no ponto logo abaixo do topo do menu?
    const noTopo = document.elementFromPoint(r.left + r.width / 2, r.top + 12)
    return {
      position: getComputedStyle(el).position,
      largura: Math.round(r.width),
      larguraBotao: Math.round(botao.width),
      alturaVisivel: Math.round(r.height),
      dentroDaJanela: r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1,
      alinhadoAoBotao: Math.abs(r.left - botao.left) < 2,
      menuContemPonto: el.contains(noTopo),
    }
  })
  console.log(`3. Geometria: ${JSON.stringify(geo)}`)
  if (geo.position !== 'fixed') erros.push(`Menu deveria ser fixed, é ${geo.position}`)
  if (!geo.menuContemPonto) {
    erros.push('Há algo desenhado por cima do menu — ele não está no topo do empilhamento')
  }
  if (geo.alturaVisivel < 40) erros.push('Menu está recortado (altura muito baixa)')
  if (!geo.alinhadoAoBotao) erros.push('Menu não está alinhado ao botão')
  if (!geo.dentroDaJanela) erros.push('Menu vaza para fora da janela')
  // Sem largura explícita o menu esticava até a borda da tela
  if (geo.largura > 260) erros.push(`Menu largo demais: ${geo.largura}px`)

  await p.screenshot({ path: `${SAIDA}/41-dropdown-aberto.png` })
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)

  // --- Ações do cabeçalho: agora recolhidas no menu da coluna ---
  await p.locator('thead th[data-modelo]').first().locator('[data-menu-coluna]').click()
  await p.waitForSelector('[data-menu-aberto]')
  const acoes = (await p.locator('[data-menu-aberto] button').allTextContents()).map((t) => t.trim())
  await p.keyboard.press('Escape')
  console.log(`4. Ações do menu da coluna: ${JSON.stringify(acoes)}`)
  if (!acoes.some((t) => /Finalizar|Reabrir/.test(t))) {
    erros.push('O menu da coluna não oferece Finalizar nem Reabrir')
  }
  if (!acoes.includes('Certificado')) erros.push('O menu da coluna perdeu o Certificado')

  await p.locator('thead th[data-modelo]').first().screenshot({ path: `${SAIDA}/42-cabecalho-coluna.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-dropdown.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
