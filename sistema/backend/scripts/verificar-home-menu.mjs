/**
 * Casca nova do sistema: menu retrátil, matriz por categoria e a home/vitrine.
 *
 * Só leitura — navega e mede, não grava nada.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.waitForTimeout(1200)

  // --- Menu ---
  const itens = await p.locator('aside nav a').allTextContents()
  console.log(`1. Menu: ${JSON.stringify(itens.map((t) => t.trim()))}`)
  const esperados = [
    'Painel de Homologação',
    'Terminal PoS',
    'Impressora Térmica',
    'Coletor de Dados',
  ]
  for (const e of esperados) {
    if (!itens.some((t) => t.trim() === e)) erros.push(`Item "${e}" não está no menu`)
  }
  for (const proibido of ['Homologações', 'Dashboard']) {
    if (itens.some((t) => t.trim() === proibido)) erros.push(`"${proibido}" ainda está no menu`)
  }

  const logoMenu = await p.locator('aside img[alt="Mobiltec"]').count()
  console.log(`2. Logo no menu: ${logoMenu}`)
  if (logoMenu !== 1) erros.push(`Esperava 1 logo no menu, achei ${logoMenu}`)

  // --- Painel: aba Homologados (padrão) e aba Em homologação ---
  const cards = await p.locator('[data-modelo]').count()
  await p.screenshot({ path: `${SAIDA}/46-home.png`, fullPage: false })

  await p.click('[role=tab]:has-text("Em homologação")')
  await p.waitForTimeout(600)
  const emHomologacao = await p.locator('[data-em-homologacao]').count()
  console.log(`3. Painel: ${cards} card(s) em Homologados, ${emHomologacao} em homologação`)
  if (cards + emHomologacao === 0) erros.push('O painel não listou nenhum dispositivo')

  // Busca filtra os cards da aba aberta
  await p.fill('input[placeholder^="Buscar"]', 'gertec')
  await p.waitForTimeout(400)
  const depois = await p.locator('[data-em-homologacao]').count()
  console.log(`4. Busca "gertec": ${emHomologacao} → ${depois}`)
  if (depois >= emHomologacao) erros.push('A busca não reduziu a lista')
  if (depois === 0) erros.push('A busca por "gertec" não achou nada')
  await p.fill('input[placeholder^="Buscar"]', '')
  await p.waitForTimeout(300)

  // --- Menu recolhe ---
  const larguraAberto = await p.locator('aside').evaluate((el) => el.getBoundingClientRect().width)
  await p.click('button[aria-label="Recolher menu"]')
  await p.waitForTimeout(400)
  const larguraFechado = await p.locator('aside').evaluate((el) => el.getBoundingClientRect().width)
  console.log(`5. Menu: ${Math.round(larguraAberto)}px → ${Math.round(larguraFechado)}px`)
  if (larguraFechado >= larguraAberto) erros.push('O menu não recolheu')
  await p.screenshot({ path: `${SAIDA}/47-menu-recolhido.png` })
  await p.click('button[aria-label="Expandir menu"]')
  await p.waitForTimeout(300)

  // --- Matriz por categoria ---
  // A trilha (esquerda) diz a seção; o h1 central é constante em toda tela
  for (const [slug, trilha] of [
    ['pos', 'Terminal PoS'],
    ['impressora-termica', 'Impressora Térmica'],
  ]) {
    await p.goto(`http://localhost:8080/matriz/${slug}`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    const dados = await p.evaluate(() => {
      const registro = document.querySelector('[data-registro]')
      const barra = document.querySelector('[data-painel] > div')
      return {
        trilha: document.querySelector('h1')?.textContent?.trim(),
        registro: registro?.textContent?.trim() ?? null,
        // Centralizado na barra, não no espaço que sobra depois da trilha
        desvioDoCentro: registro
          ? Math.round(
              Math.abs(
                registro.getBoundingClientRect().left +
                  registro.getBoundingClientRect().width / 2 -
                  (barra.getBoundingClientRect().left + barra.getBoundingClientRect().width / 2),
              ),
            )
          : null,
        // A planilha não repete o nome da categoria num título próprio
        titulosNaPagina: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
      }
    })
    const menuVisivel = await p.locator('aside nav').isVisible()
    console.log(`6. /matriz/${slug}: trilha "${dados.trilha}" | centro "${dados.registro}" (desvio ${dados.desvioDoCentro}px) | h2 ${JSON.stringify(dados.titulosNaPagina)} | menu: ${menuVisivel}`)
    if (dados.trilha !== trilha) erros.push(`/matriz/${slug} deveria trilhar "${trilha}", trouxe "${dados.trilha}"`)
    if (dados.registro !== 'Registro de Testes Internos') {
      erros.push(`A planilha deveria trazer o nome do registro, veio "${dados.registro}"`)
    }
    if (dados.desvioDoCentro !== null && dados.desvioDoCentro > 2) {
      erros.push(`Nome do registro ${dados.desvioDoCentro}px fora do centro`)
    }
    if (dados.titulosNaPagina.some((t) => t.includes('Homologação'))) {
      erros.push('A matriz voltou a ter título próprio repetindo a seção')
    }
    if (!menuVisivel) erros.push(`/matriz/${slug} perdeu o menu lateral`)
  }

  // --- Botão Revalidados ---
  await p.goto('http://localhost:8080/matriz/pos', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(600)
  const botao = p.locator('button:has-text("Revalidados")')
  const desabilitado = await botao.isDisabled()
  const colunasAntes = await p.locator('thead th[data-modelo]').count()
  console.log(`7. "Revalidados" desabilitado: ${desabilitado} | ${colunasAntes} coluna(s)`)

  if (!desabilitado) {
    await botao.click()
    await p.waitForTimeout(600)
    const colunasDepois = await p.locator('thead th[data-modelo]').count()
    console.log(`   após filtrar: ${colunasDepois} coluna(s)`)
    if (colunasDepois > colunasAntes) erros.push('Filtro de Revalidados aumentou as colunas')
    if (colunasDepois === 0) erros.push('Filtro de Revalidados zerou a planilha')
    await botao.click()
    await p.waitForTimeout(400)
  }
  await p.screenshot({ path: `${SAIDA}/48-matriz-no-menu.png` })

  // --- Rail some com filtro de itens (acionado pelo painel de divergências) ---
  await p.locator('[data-painel-divergencias]').click()
  await p.locator('button:has-text("filtrar para resolver")').click()
  await p.waitForTimeout(800)
  const rails = await p.locator('tbody > tr > td[rowspan]').count()
  console.log(`8. Rails com filtro de itens: ${rails} (esperado 0)`)
  if (rails !== 0) erros.push(`O rail deveria sumir com filtro de itens, achei ${rails}`)
  await p.screenshot({ path: `${SAIDA}/49-matriz-filtrada-sem-rail.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-home-menu.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
