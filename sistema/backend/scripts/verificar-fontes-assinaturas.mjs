/** Verifica o painel de Fontes e Assinaturas na tela do certificado. */
import { chromium } from 'playwright'

const HOM_ID = process.argv[2]
const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1500, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login')
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')

  await p.goto(`http://localhost:8080/homologacoes/${HOM_ID}/certificado`, { waitUntil: 'networkidle' })
  await p.waitForSelector('text=Assinaturas', { timeout: 10000 })
  console.log('1. Painel carregou')
  await p.screenshot({ path: `${SAIDA}/24-painel-certificado.png` })

  // --- Assinaturas ---
  // O placeholder de Responsável é o nome real do usuário (sempre preenchido),
  // não o texto literal — por isso mira pelo rótulo, não pelo placeholder.
  const campoResp = p.getByText('Responsável Técnico', { exact: true }).locator('..').locator('input')
  await campoResp.fill('Playwright Testador')
  await campoResp.blur()
  await p.waitForTimeout(1500)
  console.log('2. Assinatura do responsável preenchida e salva')

  // --- Fontes ---
  const marca = Date.now().toString().slice(-5)
  await p.fill('input[placeholder="Título da referência"]', `Fonte de teste ${marca}`)
  await p.fill('input[placeholder="https:// (opcional)"]', 'https://example.com/doc')
  await p.click('button:has-text("Adicionar fonte")')
  await p.waitForTimeout(1500)

  const naLista = await p.locator(`text=Fonte de teste ${marca}`).count()
  console.log(`3. Fonte apareceu na lista lateral: ${naLista > 0}`)
  if (naLista === 0) erros.push('Fonte adicionada não apareceu na lista')

  await p.screenshot({ path: `${SAIDA}/25-fonte-adicionada.png` })

  // --- Reflete no preview (iframe) ---
  await p.waitForTimeout(1000)
  const frame = p.frameLocator('iframe[title="Preview do certificado"]')
  const textoCert = await frame.locator('body').textContent()
  const temNoPreview = textoCert.includes(`Fonte de teste ${marca}`)
  const temAssinatura = textoCert.includes('Playwright Testador')
  console.log(`4. Preview mostra a nova fonte: ${temNoPreview}`)
  console.log(`5. Preview mostra a assinatura: ${temAssinatura}`)
  if (!temNoPreview) erros.push('A fonte não apareceu no preview do certificado')
  if (!temAssinatura) erros.push('A assinatura não apareceu no preview do certificado')

  // --- Persistiu no backend ---
  const resposta = await p.evaluate(async (id) => {
    const r = await fetch(`/api/homologacoes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    })
    return r.json()
  }, HOM_ID)
  console.log(`6. Backend: assinaturaResponsavel="${resposta.assinaturaResponsavel}" | fontes=${resposta.fontes.length}`)
  if (resposta.assinaturaResponsavel !== 'Playwright Testador') {
    erros.push(`assinaturaResponsavel não persistiu: "${resposta.assinaturaResponsavel}"`)
  }

  // --- Remover a fonte ---
  await p.locator('li', { hasText: `Fonte de teste ${marca}` }).locator('button[title="Remover"]').click()
  await p.waitForTimeout(1200)
  const depoisRemover = await p.locator(`text=Fonte de teste ${marca}`).count()
  console.log(`7. Fonte removida da lista: ${depoisRemover === 0}`)
  if (depoisRemover !== 0) erros.push('Remover fonte não funcionou')

  await p.screenshot({ path: `${SAIDA}/26-fonte-removida.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-fontes.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
