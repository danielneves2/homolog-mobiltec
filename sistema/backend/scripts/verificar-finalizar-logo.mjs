/** Logo, filtros "todos", botão Finalizar e a regra de divergência sem justificativa. */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  // --- Login novo ---
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  const logoLogin = await p.locator('img[alt="Mobiltec"]').count()
  console.log(`1. Logo oficial na tela de login: ${logoLogin} ocorrência(s)`)
  if (logoLogin === 0) erros.push('Logo não renderizou no login')
  await p.screenshot({ path: `${SAIDA}/32-login.png` })

  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')

  // --- Matriz: logo + filtros ---
  await p.goto('http://localhost:8080/matriz', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(800)

  // A logo saiu da barra da matriz e passou a viver no menu lateral, para
  // não aparecer duas vezes na mesma tela.
  const logoMenu = await p.locator('aside img[alt="Mobiltec"]').count()
  const logoBarra = await p.locator('header img[alt="Mobiltec"]').count()
  console.log(`2. Logo oficial — menu: ${logoMenu} | barra da matriz: ${logoBarra}`)
  if (logoMenu !== 1) erros.push(`Esperava 1 logo no menu, achei ${logoMenu}`)
  if (logoBarra !== 0) erros.push('A logo voltou a duplicar na barra da matriz')

  const contarColunas = () => p.locator('thead tr').first().locator('th[data-modelo]').count()
  // Por `data-filtro`, não por posição nem por texto: a barra ganhou o filtro
  // de Modelo no meio (os índices saíram do lugar) e o texto do botão vira o
  // valor escolhido assim que se filtra alguma coisa
  const filtro = (nome) => p.locator(`button[data-filtro="${nome}"]`)
  async function escolherOpcao(rotulo, idx) {
    await filtro(rotulo).click()
    await p.locator('[role=option]').nth(idx).click()
    await p.waitForTimeout(700)
  }

  // O botão fechado mostra o rótulo curto; a lista aberta, o "Todos…"
  const rotuloFechado = await filtro('Fabricante').textContent()
  await filtro('Fabricante').click()
  const primeiraOpcao = await p.locator('[role=option]').first().textContent()
  await p.keyboard.press('Escape')
  console.log(`3. Botão fechado: "${rotuloFechado.trim()}" | 1ª opção: "${primeiraOpcao}"`)
  if (!/^Todos/.test(primeiraOpcao)) erros.push('Primeira opção não é "Todos…"')
  if (/Todos/.test(rotuloFechado)) erros.push('O botão fechado deveria mostrar só o rótulo curto')

  const totalColunas = await contarColunas()
  await escolherOpcao('Fabricante', 1)
  const filtrado = await contarColunas()
  await escolherOpcao('Fabricante', 0)
  const voltou = await contarColunas()
  console.log(`4. ${totalColunas} -> filtra ${filtrado} -> "Todos" restaura ${voltou}`)
  if (voltou !== totalColunas) erros.push('A opção "Todos" não restaurou todas as colunas')

  // --- Filtro de situação ---
  await filtro('Status').click()
  const opcoesSituacao = await p.locator('[role=option]').allTextContents()
  await p.keyboard.press('Escape')
  console.log(`5. Filtro de status: ${JSON.stringify(opcoesSituacao)}`)
  if (!opcoesSituacao.some((t) => /^Todos os status/.test(t))) {
    erros.push(`O filtro deveria se chamar "status": ${JSON.stringify(opcoesSituacao)}`)
  }
  await escolherOpcao('Status', 2) // Finalizados
  const finalizados = await contarColunas()
  console.log(`6. Modelos finalizados hoje: ${finalizados}`)
  await escolherOpcao('Status', 0)

  // --- Finalizar: agora dentro do menu da coluna ---
  const menus = await p.locator('thead th[data-modelo] [data-menu-coluna]').count()
  console.log(`7. Menus de coluna: ${menus}`)
  if (menus === 0) erros.push('Nenhum menu de coluna renderizou')

  await p.locator('thead th[data-modelo] [data-menu-coluna]').first().click()
  await p.waitForSelector('[data-menu-aberto]')
  await p.locator('[data-menu-aberto] button', { hasText: /Finalizar|Reabrir/ }).click()
  await p.waitForSelector('[role=dialog]', { timeout: 5000 })
  const textoModal = await p.locator('[role=dialog]').textContent()
  const temChecklist = /Fica pendente|itens avaliados/.test(textoModal)
  const temBotoes =
    (await p.locator('[role=dialog] button:has-text("Homologado")').count()) > 0
  console.log(`8. Modal abriu | tem checklist: ${temChecklist} | tem os 2 botões: ${temBotoes}`)
  if (!temBotoes) erros.push('Modal de finalizar sem os botões de decisão')
  if (!temChecklist) erros.push('O modal perdeu o checklist do que falta')
  await p.screenshot({ path: `${SAIDA}/33-modal-finalizar.png` })
  await p.keyboard.press('Escape')

  // --- Certificado: divergência sem justificativa sai em branco ---
  const href = await p
    // O link do certificado foi para o menu da coluna: o id vem da API
    .evaluate(async () => {
      const nome = document.querySelector('thead th[data-modelo]').dataset.modelo
      const t = localStorage.getItem('homolog.token')
      const m = await (
        await fetch('/api/matriz?categoriaSlug=pos', { headers: { Authorization: `Bearer ${t}` } })
      ).json()
      return m.colunas.find((c) => c.homologacao.dispositivo.nomeComercial === nome).homologacao.id
    })
  const hid = href

  const dados = await p.evaluate(async (id) => {
    const t = localStorage.getItem('homolog.token')
    const h = { Authorization: `Bearer ${t}` }
    const hom = await (await fetch(`/api/homologacoes/${id}`, { headers: h })).json()
    const html = await (await fetch(`/api/homologacoes/${id}/certificado/preview`, { headers: h })).text()
    const semJust = hom.resultados.filter(
      (r) =>
        ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA'].includes(r.status) &&
        !r.justificativaTexto &&
        !r.justificativa?.texto,
    )
    return {
      semJust: semJust.map((r) => r.item.nome),
      // Conta as linhas cujo status renderizado ficou vazio
      linhasVazias: (html.match(/<td><\/td>/g) || []).length,
      temNaoSuportado: html.includes('[ ------ ]'),
    }
  }, hid)

  console.log(`9. Itens divergentes sem justificativa: ${dados.semJust.length} (${dados.semJust.slice(0, 4).join(', ')})`)
  console.log(`10. Células em branco no certificado: ${dados.linhasVazias}`)
  if (dados.semJust.length > 0 && dados.linhasVazias < dados.semJust.length) {
    erros.push('Divergências sem justificativa ainda aparecem com status no certificado')
  }
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-finalizar.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
