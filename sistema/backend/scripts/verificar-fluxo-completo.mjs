/**
 * Fluxo pedido pelo usuário:
 * cadastra na "planilha" → o certificado do modelo atualiza sozinho → exporta.
 */
import { chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []
const marca = Date.now().toString().slice(-6)
const prisma = new PrismaClient()

/**
 * Apaga as cobaias que este roteiro cria.
 *
 * Ele cadastra modelo de verdade e emite certificado de verdade — sem
 * limpeza, cada execução deixava mais uma coluna "Morefun MP860-<número>" na
 * planilha do usuário. O filtro é o padrão exato do nome gerado aqui, para
 * não encostar no "Morefun MF960", que é modelo real do catálogo.
 */
async function limpar() {
  const cobaias = await prisma.dispositivo.findMany({
    where: { fabricante: 'Morefun', modelo: { startsWith: 'MP860-' } },
    select: { id: true, modelo: true },
  })
  const soGeradas = cobaias.filter((d) => /^MP860-\d{4,}$/.test(d.modelo))
  if (!soGeradas.length) return 0
  const ids = soGeradas.map((d) => d.id)
  const homs = await prisma.homologacao.findMany({
    where: { dispositivoId: { in: ids } },
    select: { id: true },
  })
  const idsHom = homs.map((h) => h.id)
  await prisma.certificadoEmitido.deleteMany({ where: { homologacaoId: { in: idsHom } } })
  await prisma.logReabertura.deleteMany({ where: { homologacaoId: { in: idsHom } } })
  await prisma.resultado.deleteMany({ where: { homologacaoId: { in: idsHom } } })
  await prisma.homologacao.deleteMany({ where: { id: { in: idsHom } } })
  await prisma.dispositivo.deleteMany({ where: { id: { in: ids } } })
  return soGeradas.length
}

await limpar()

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login')
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')

  // --- 1. Cadastrar novo modelo pela matriz ---
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  const colunasAntes = await p.locator('thead tr').first().locator('th').count()

  // "Cadastrar novo modelo" é o TÍTULO do modal; o botão que o abre chama-se
  // "+ Novo modelo" desde que a barra de filtros foi compactada. Esperar pelo
  // título sem abrir nada deixava este roteiro parado até o timeout.
  await p.click('button:has-text("Novo modelo")')
  await p.waitForSelector('text=Cadastrar novo modelo')
  await p.waitForSelector('text=Identidade do modelo')

  const campo = (rotulo) =>
    p.locator('div').filter({ hasText: new RegExp(`^${rotulo}`) }).last().locator('input')

  await p.getByLabel('Fabricante', { exact: false }).first().fill('Morefun').catch(() => {})
  // Preenche por posição — os rótulos usam a classe label-caps, não <label for>
  const inputs = p.locator('form input[type=text], form input:not([type])')
  await inputs.nth(0).fill('Morefun')
  await inputs.nth(1).fill(`MP860-${marca}`)
  await inputs.nth(2).fill(`Morefun MP860 ${marca}`)
  await inputs.nth(3).fill(`SN-${marca}`)
  await inputs.nth(6).fill('Android 10')
  await inputs.nth(7).fill('Agente PoS')
  await inputs.nth(8).fill('11.21.1')

  await p.click('button:has-text("Cadastrar modelo")')
  await p.waitForTimeout(2500)

  const colunasDepois = await p.locator('thead tr').first().locator('th').count()
  console.log(`1. Colunas na matriz: ${colunasAntes} -> ${colunasDepois}`)
  if (colunasDepois <= colunasAntes) erros.push('A nova coluna não apareceu na matriz')
  await p.screenshot({ path: `${SAIDA}/12-matriz-com-novo-modelo.png` })

  // --- 2. Marcar alguns itens na coluna nova ---
  // As colunas são ordenadas por nome, não por data de criação: localiza pelo
  // modelo em vez de assumir que a nova está no fim.
  const nomeModelo = `Morefun MP860 ${marca}`
  const cabecalhos = await p.locator('thead tr').first().locator('th[data-modelo]').all()
  const nomes = await Promise.all(cabecalhos.map((h) => h.getAttribute('data-modelo')))
  const iColuna = nomes.indexOf(nomeModelo)
  console.log(`   coluna do modelo novo: ${iColuna} de ${nomes.length}`)
  if (iColuna === -1) throw new Error(`Coluna "${nomeModelo}" não encontrada`)

  const linhas = p.locator('tbody tr')
  let marcados = 0
  for (let i = 0; i < 3; i++) {
    await linhas.nth(i).locator('td button[data-status]').nth(iColuna).click()
    await p.waitForTimeout(250)
    await p.locator('div.fixed.z-50 button').nth(0).click() // OK
    await p.waitForTimeout(800)
    marcados++
  }
  console.log(`2. ${marcados} itens marcados como OK na coluna nova`)

  // --- 3. Abrir o certificado desse modelo ---
  // Era um link solto no cabeçalho; virou opção do hambúrguer da coluna
  // quando as quatro ações foram recolhidas para dentro do menu.
  await p.locator(`thead th[data-modelo="${nomeModelo}"] [data-menu-coluna]`).click()
  await p.waitForSelector('[data-menu-aberto]')
  await p.locator('[data-menu-aberto] button', { hasText: 'Certificado' }).click()
  await p.waitForURL(/\/certificado$/, { timeout: 10000 })
  await p.waitForSelector('iframe[title="Preview do certificado"]', { timeout: 15000 })
  await p.waitForTimeout(2500)
  console.log('3. Página do certificado abriu com o preview')

  const avisoPendentes = await p.locator('text=não testado').count()
  console.log(`4. Avisa sobre itens pendentes: ${avisoPendentes > 0}`)

  await p.screenshot({ path: `${SAIDA}/13-certificado-tela.png` })

  // O preview deve refletir os 3 itens marcados agora
  const frame = p.frameLocator('iframe[title="Preview do certificado"]')
  const textoCert = await frame.locator('body').textContent()
  const temModelo = textoCert.includes(`MP860-${marca}`)
  const temOk = (textoCert.match(/\[OK\]/g) ?? []).length
  console.log(`5. Certificado traz o modelo cadastrado: ${temModelo}`)
  console.log(`6. Itens [OK] no certificado: ${temOk} (esperado ${marcados})`)
  if (!temModelo) erros.push('O certificado não reflete o modelo recém-cadastrado')
  if (temOk !== marcados) erros.push(`Esperava ${marcados} [OK], achei ${temOk}`)

  // --- 4. Emitir e arquivar ---
  await p.click('button:has-text("Emitir e arquivar")')
  await p.waitForSelector('text=Emissões arquivadas', { timeout: 30000 })
  console.log('7. Certificado emitido e arquivado')
  await p.screenshot({ path: `${SAIDA}/14-certificado-emitido.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-fluxo.png` }).catch(() => {})
} finally {
  await nav.close()
  console.log(`\nLimpeza: ${await limpar()} cobaia(s) removida(s) da planilha`)
  await prisma.$disconnect()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
