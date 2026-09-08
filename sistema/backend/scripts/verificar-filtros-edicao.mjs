/** Verifica os filtros da matriz e a edição de texto pelo lápis do certificado. */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

const contarLinhas = () => p.locator('tbody tr').count()
const contarColunas = () => p.locator('thead tr').first().locator('th[data-modelo]').count()

// A barra usa dropdown próprio (SeletorFiltro), não <select> nativo:
// o botão fechado mostra o rótulo curto e a lista mostra o texto completo.
const filtro = (i) => p.locator('button[aria-haspopup=listbox]').nth(i)

async function opcoesDoFiltro(i) {
  await filtro(i).click()
  const textos = await p.locator('[role=option]').allTextContents()
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
  return textos
}

async function escolherOpcao(i, indiceOpcao) {
  await filtro(i).click()
  await p.locator('[role=option]').nth(indiceOpcao).click()
  await p.waitForTimeout(700)
}

/** Índice 0 é sempre a opção "Todos…", que limpa o filtro */
const limparFiltro = (i) => escolherOpcao(i, 0)

try {
  await p.goto('http://localhost:8080/login')
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')

  const colunasTodas = await p.locator('thead tr').first().locator('th[data-modelo]').count()
  const linhasTodas = await contarLinhas()
  console.log(`0. Base: ${colunasTodas} modelos, ${linhasTodas} linhas`)

  // --- "Só divergências" sumiu ---
  const checkboxVelho = await p.locator('text=Só divergências').count()
  console.log(`1. Checkbox antigo removido da barra: ${checkboxVelho === 0 ? 'sim' : 'ainda existe (é opção do seletor)'}`)

  // --- Filtro por fabricante (dropdown 0) ---
  const fabricantes = await opcoesDoFiltro(0)
  console.log(`2. Fabricantes no filtro: ${fabricantes.length - 1} (${fabricantes.slice(1, 4).join(', ')}…)`)
  await escolherOpcao(0, 1)
  const colunasFiltradas = await contarColunas()
  console.log(`3. Filtro fabricante "${fabricantes[1]}": ${colunasTodas} -> ${colunasFiltradas} colunas`)
  if (colunasFiltradas >= colunasTodas) erros.push('Filtro de fabricante não reduziu as colunas')
  await p.screenshot({ path: `${SAIDA}/27-filtro-fabricante.png` })
  await limparFiltro(0)

  // --- Filtro por versão do agente (dropdown 1) ---
  const versoes = await opcoesDoFiltro(1)
  await escolherOpcao(1, 1)
  const colunasVer = await contarColunas()
  console.log(`4. Filtro versão do agente "${versoes[1]}": ${colunasTodas} -> ${colunasVer} colunas`)
  if (colunasVer >= colunasTodas) erros.push('Filtro de versão do agente não reduziu as colunas')
  await limparFiltro(1)

  // --- Filtro de linhas (dropdown 3): 1=faltam, 2=divergências, 3=sem justificativa ---
  await escolherOpcao(3, 1)
  const linhasFaltam = await contarLinhas()
  console.log(`5. "Faltam homologar": ${linhasTodas} -> ${linhasFaltam} linhas`)
  if (linhasFaltam >= linhasTodas) erros.push('Filtro "faltam" não reduziu as linhas')

  await escolherOpcao(3, 2)
  const linhasDiv = await contarLinhas()
  console.log(`6. "Só divergências": ${linhasTodas} -> ${linhasDiv} linhas`)
  await p.screenshot({ path: `${SAIDA}/28-filtro-divergencias.png` })
  await limparFiltro(3)

  // --- Painel de divergências ---
  // O badge foi compactado para caber na barra: o texto agora é só a contagem,
  // e a explicação foi para o `title`.
  const botaoDiv = p.locator('button[aria-expanded][title*="divergência"]').first()
  const textoBotao = await botaoDiv.textContent()
  const titulo = await botaoDiv.getAttribute('title')
  console.log(`7. Alerta na barra: "${textoBotao.trim()}" (title: "${titulo}")`)
  await botaoDiv.click()
  await p.waitForTimeout(500)
  const painelAberto = await p.locator('text=Não aplicável" não conta como divergência').count()
  console.log(`8. Painel de divergências abriu: ${painelAberto > 0}`)
  if (painelAberto === 0) erros.push('Painel de divergências não abriu')
  await p.screenshot({ path: `${SAIDA}/29-painel-divergencias.png` })

  // --- Lápis no certificado ---
  const idHom = await p
    .locator('thead th[data-modelo]')
    .first()
    .locator('a[href*="/certificado"]')
    .getAttribute('href')
  await p.goto(`http://localhost:8080${idHom}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('iframe[title="Preview do certificado"]')
  await p.waitForTimeout(2500)

  const frame = p.frameLocator('iframe[title="Preview do certificado"]')
  const lapis = frame.locator('.editar[data-tipo="divergencia"]')
  const qtdLapis = await lapis.count()
  console.log(`9. Lápis de divergência no preview: ${qtdLapis}`)
  if (qtdLapis === 0) erros.push('Nenhum lápis de divergência renderizou')

  const marca = Date.now().toString().slice(-5)
  await lapis.first().click()
  await p.waitForSelector('[role=dialog]', { timeout: 5000 })
  console.log('10. Modal de edição abriu ao clicar no lápis')
  await p.screenshot({ path: `${SAIDA}/30-modal-editar.png` })

  const novoTexto = `Texto editado pelo lapis ${marca}.`
  await p.locator('[role=dialog] textarea').fill(novoTexto)
  await p.locator('[role=dialog] button:has-text("Salvar")').click()
  await p.waitForTimeout(3000)

  const frame2 = p.frameLocator('iframe[title="Preview do certificado"]')
  const textoCert = await frame2.locator('body').textContent()
  const refletiu = textoCert.includes(novoTexto)
  console.log(`11. Preview reflete o texto editado: ${refletiu}`)
  if (!refletiu) erros.push('O texto editado não apareceu no preview')

  // --- Lápis NÃO pode sair no PDF ---
  const htmlPdf = await p.evaluate(async (hid) => {
    const r = await fetch(`/api/homologacoes/${hid}/certificado/preview`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    })
    return r.text()
  }, idHom.split('/')[2])
  const temLapisNoPdf = htmlPdf.includes('class="editar"')
  console.log(`12. Preview sem ?editavel não traz lápis: ${!temLapisNoPdf}`)
  if (temLapisNoPdf) erros.push('O lápis vaza para a versão não-editável (usada no PDF)')

  await p.screenshot({ path: `${SAIDA}/31-texto-editado.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-filtros.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
