/** Renderiza o preview do certificado e captura cada página. */
import { chromium } from 'playwright'

const HOM_ID = process.argv[2]
const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 900, height: 1200 } })

// Autentica pela API e injeta o token, já que a rota exige Bearer
await p.goto('http://localhost:8080/login')
await p.fill('#email', 'admin@mobiltec.com.br')
await p.fill('#senha', 'admin123')
await p.click('button[type=submit]')
await p.waitForURL('http://localhost:8080/')

const html = await p.evaluate(async (id) => {
  const r = await fetch(`/api/homologacoes/${id}/certificado/preview`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
  })
  return r.text()
}, HOM_ID)

await p.setContent(html, { waitUntil: 'networkidle' })

const paginas = await p.locator('.pagina').count()
console.log(`Páginas: ${paginas}`)

for (let i = 0; i < paginas; i++) {
  await p.locator('.pagina').nth(i).screenshot({ path: `${SAIDA}/cert-p${i + 1}.png` })
  console.log(`  página ${i + 1} capturada`)
}

// Confere que nenhum NAO_TESTADO vazou para o documento (spec §8.3)
const texto = await p.locator('body').textContent()
const vazou = texto.includes('Não testado') || texto.includes('NAO_TESTADO')
console.log(`NAO_TESTADO fora do certificado: ${!vazou}`)

await nav.close()
process.exit(vazou ? 1 : 0)
