/**
 * Ciclo finalizar → somente leitura → reabrir, e a observação na célula
 * (capacidade herdada do checklist removido).
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

const marca = Date.now().toString().slice(-5)

try {
  await p.goto('http://localhost:8080/login')
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')

  // --- O checklist sumiu ---
  const linksChecklist = await p.locator('a[href*="/checklist"]').count()
  console.log(`1. Links de checklist na matriz: ${linksChecklist}`)
  if (linksChecklist > 0) erros.push('Ainda há link para o checklist')

  const resp = await p.evaluate(() => fetch('/checklist').then((r) => r.status).catch(() => 'erro'))
  console.log(`2. Rota /checklist não existe mais no app (SPA responde ${resp})`)

  const acoes = await p.locator('thead th[data-modelo]').first().textContent()
  console.log(`3. Ações no cabeçalho: "${acoes.replace(/\s+/g, ' ').trim()}"`)

  // --- Observação pela célula ---
  const linha = p.locator('tbody tr').first()
  await linha.locator('td button[data-status]').first().click()
  await p.waitForTimeout(400)
  const temObservacao = await p.locator('[role=menu] button', { hasText: 'Observação' }).count()
  console.log(`4. "Observação" no menu da célula: ${temObservacao > 0}`)
  if (temObservacao === 0) erros.push('Menu da célula sem a opção Observação')
  await p.screenshot({ path: `${SAIDA}/37-menu-celula.png` })

  await p.locator('[role=menu] button', { hasText: 'Observação' }).click()
  await p.waitForSelector('[role=dialog]', { timeout: 5000 })
  const texto = `Observacao de teste ${marca}`
  await p.locator('[role=dialog] textarea').fill(texto)
  await p.locator('[role=dialog] button:has-text("Salvar")').click()
  await p.waitForTimeout(2000)

  const salvou = await p.evaluate(async (t) => {
    const r = await fetch('/api/matriz?categoriaSlug=pos', {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    })
    const m = await r.json()
    return m.colunas.some((c) => c.homologacao.resultados.some((x) => x.observacao === t))
  }, texto)
  console.log(`5. Observação persistiu no banco: ${salvou}`)
  if (!salvou) erros.push('Observação não foi salva')

  // --- Finalizar não bloqueia ---
  // Pendência é aviso, não trava: o checklist aparece e os dois botões
  // continuam ativos. Quem valida e assina é o gerente de produto.
  await p.locator('thead th[data-modelo] [data-menu-coluna]').first().click()
  await p.waitForSelector('[data-menu-aberto]')
  await p.locator('[data-menu-aberto] button', { hasText: /Finalizar|Reabrir/ }).click()
  await p.waitForSelector('[role=dialog]')
  const conteudo = await p.locator('[role=dialog]').textContent()
  const listaPendencias = /Fica pendente/.test(conteudo)
  const desabilitado = await p
    .locator('[role=dialog] button:has-text("Homologado")')
    .first()
    .isDisabled()
  console.log(`6. Modal: lista pendências=${listaPendencias} | botão desabilitado=${desabilitado}`)
  if (desabilitado) erros.push('O modal voltou a bloquear a finalização')
  // O modal fecha no clique fora, não no Escape — sem isso ele intercepta o
  // clique seguinte
  await p.locator('[role=dialog] button', { hasText: 'Cancelar' }).click()
  await p.waitForSelector('[role=dialog]', { state: 'detached' })

  // Uma coluna finalizada oferece "Reabrir" no lugar de "Finalizar"
  await p.locator('thead th[data-modelo] [data-menu-coluna]').first().click()
  await p.waitForSelector('[data-menu-aberto]')
  const ultima = (await p.locator('[data-menu-aberto] button').allTextContents()).at(-1)?.trim()
  await p.keyboard.press('Escape')
  console.log(`7. Última ação do menu: "${ultima}"`)
  if (!/Finalizar|Reabrir/.test(ultima ?? '')) {
    erros.push(`A última ação deveria ser Finalizar ou Reabrir, é "${ultima}"`)
  }

  await p.screenshot({ path: `${SAIDA}/38-cabecalho-acoes.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-ciclo.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
