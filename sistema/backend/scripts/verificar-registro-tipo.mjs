/**
 * Registro de tipo de dispositivo, ponta a ponta.
 *
 * Cadastra um tipo pela tela — tirando duas linhas da ficha, zerando um tópico
 * inteiro e escrevendo um item novo —, cadastra um modelo nele e confere que a
 * planilha resultante mostra exatamente o que foi configurado: nem uma linha a
 * mais nem a menos, e o tipo anterior (PoS) intacto.
 *
 * Limpa o que criou no fim, inclusive se falhar no meio: senão cada execução
 * deixaria um tipo a mais no menu.
 */
import { chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const NOME_TIPO = 'Zz Verificacao Automatizada'
const ITEM_NOVO = 'Zz item escrito no registro'
const erros = []

const prisma = new PrismaClient()

/** Apaga tudo que uma execução deste script pode ter deixado para trás */
async function limpar() {
  const cats = await prisma.categoria.findMany({
    where: { nome: { startsWith: 'Zz Verificacao' } },
    select: { id: true },
  })
  const ids = cats.map((c) => c.id)
  if (ids.length) {
    const disp = await prisma.dispositivo.findMany({
      where: { categoriaId: { in: ids } },
      select: { id: true },
    })
    const homs = await prisma.homologacao.findMany({
      where: { dispositivoId: { in: disp.map((d) => d.id) } },
      select: { id: true },
    })
    await prisma.resultado.deleteMany({ where: { homologacaoId: { in: homs.map((h) => h.id) } } })
    await prisma.homologacao.deleteMany({ where: { id: { in: homs.map((h) => h.id) } } })
    await prisma.dispositivo.deleteMany({ where: { id: { in: disp.map((d) => d.id) } } })
    const bats = await prisma.bateriaTeste.findMany({
      where: { categoriaId: { in: ids } },
      select: { id: true },
    })
    await prisma.bateriaItem.deleteMany({ where: { bateriaId: { in: bats.map((b) => b.id) } } })
    await prisma.bateriaTeste.deleteMany({ where: { id: { in: bats.map((b) => b.id) } } })
    await prisma.categoria.deleteMany({ where: { id: { in: ids } } })
  }
  // O item escrito na tela vira catálogo — some junto com o tipo que o criou
  await prisma.bateriaItem.deleteMany({ where: { item: { nome: { startsWith: 'Zz item' } } } })
  await prisma.itemTeste.deleteMany({ where: { nome: { startsWith: 'Zz item' } } })
  return ids.length
}

await limpar()

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

/** Chama a API com o token que a sessão do browser já tem */
const api = (caminho) =>
  p.evaluate(
    (c) =>
      fetch(`/api${c}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
      }).then((r) => r.json()),
    caminho,
  )

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.waitForTimeout(700)

  // Contagens tiradas do catálogo vivo, e não fixas no roteiro: escrever item
  // novo é funcionalidade, então 48 deixou de ser um número estável — na
  // primeira vez que alguém usou a tela, este roteiro quebrou sozinho.
  const catalogo = await api('/itens-teste')
  const TOTAL = catalogo.length
  const PERFIS = catalogo.filter((i) => i.grupo === 'PERFIS').length
  /** O que sobra ao zerar Perfis e escrever um item */
  const NA_BATERIA = TOTAL - PERFIS + 1
  const posInicial = await api('/matriz?categoriaSlug=pos')
  const posAntes = posInicial.itens.length
  const fichaPosAntes = JSON.stringify(posInicial.categoria.camposFicha)
  console.log(
    `0. Catálogo: ${TOTAL} itens (${PERFIS} em Perfis) | PoS hoje com ${posAntes} linhas e ficha ${fichaPosAntes.length > 2 ? posInicial.categoria.camposFicha.length + ' campos' : 'inteira'}`,
  )

  // --- 1. A porta no menu, sempre abaixo dos tipos ---
  const menu = await p.evaluate(() =>
    [...document.querySelectorAll('aside nav a')].map((a) => ({
      rotulo: a.textContent.trim(),
      href: a.getAttribute('href'),
      y: Math.round(a.getBoundingClientRect().top),
    })),
  )
  console.log(`1. Menu: ${JSON.stringify(menu.map((m) => m.rotulo))}`)

  // O registro não é mais uma tela no menu: é um grupo que se desdobra
  const grupo = await p.evaluate(() => {
    const b = document.querySelector('[data-grupo-menu]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { rotulo: b.textContent.trim(), y: Math.round(r.top), expandido: b.ariaExpanded }
  })
  console.log(`1b. Grupo do menu: ${JSON.stringify(grupo)}`)
  if (!grupo) erros.push('Falta o grupo "Registro de dispositivo" no menu lateral')
  else {
    if (grupo.rotulo !== 'Registro de dispositivo') {
      erros.push(`Rótulo inesperado no grupo: "${grupo.rotulo}"`)
    }
    const tipos = menu.filter((m) => m.href?.startsWith('/matriz/'))
    const maisBaixo = Math.max(...tipos.map((t) => t.y))
    if (grupo.y <= maisBaixo) {
      erros.push(`O grupo não está abaixo dos tipos (y=${grupo.y} vs ${maisBaixo})`)
    }
    // Fechado antes do clique: as opções aparecem quando se clica nele
    if (grupo.expandido !== 'false') {
      erros.push(`O grupo já nasce aberto fora do próprio caminho: aria-expanded=${grupo.expandido}`)
    }
  }

  await p.click('[data-grupo-menu]')
  await p.waitForTimeout(350)
  const opcoesGrupo = await p.evaluate(() =>
    [...document.querySelectorAll('aside nav a[href^="/registro"]')].map((a) => ({
      rotulo: a.textContent.trim(),
      href: a.getAttribute('href'),
    })),
  )
  console.log(`1c. Opções do grupo: ${JSON.stringify(opcoesGrupo)}`)
  const esperadasNoGrupo = [
    { rotulo: 'Registrar dispositivo', href: '/registro' },
    { rotulo: 'Editar / remover dispositivo', href: '/registro/tipos' },
  ]
  if (JSON.stringify(opcoesGrupo) !== JSON.stringify(esperadasNoGrupo)) {
    erros.push(`Opções do grupo fora do esperado: ${JSON.stringify(opcoesGrupo)}`)
  }

  // --- 1d. Com o menu recolhido não há onde desdobrar: sai um painel ao lado ---
  await p.click('button[aria-label="Recolher menu"]')
  await p.waitForTimeout(400)
  await p.click('[data-grupo-menu]')
  await p.waitForSelector('[data-menu-flutuante]')
  const flutuante = await p.evaluate(() => {
    const m = document.querySelector('[data-menu-flutuante]')
    const b = document.querySelector('[data-grupo-menu]')
    const rm = m.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return {
      opcoes: [...m.querySelectorAll('a')].map((a) => a.textContent.trim()),
      aDireitaDoIcone: rm.left >= rb.right,
      dentroDaJanela: rm.right <= innerWidth && rm.bottom <= innerHeight && rm.top >= 0,
    }
  })
  console.log(`1d. Painel flutuante: ${JSON.stringify(flutuante)}`)
  if (flutuante.opcoes.length !== 2) {
    erros.push(`O painel recolhido não trouxe as duas opções: ${JSON.stringify(flutuante.opcoes)}`)
  }
  if (!flutuante.aDireitaDoIcone) erros.push('O painel recolhido abriu por cima do menu, não ao lado')
  if (!flutuante.dentroDaJanela) erros.push('O painel recolhido nasceu fora da janela')
  await p.keyboard.press('Escape')
  await p.click('button[aria-label="Expandir menu"]')
  await p.waitForTimeout(400)
  await p.click('[data-grupo-menu]')
  await p.waitForTimeout(300)

  // --- 2. A tela de registro ---
  await p.click('aside nav a[href="/registro"]')
  await p.waitForURL('http://localhost:8080/registro')
  await p.waitForSelector('[data-grupo-registro="PERFIS"] input[type=checkbox]')
  await p.waitForTimeout(400)

  const trilha = (await p.locator('h1').first().textContent()).trim()
  console.log(`2. Trilha da barra: "${trilha}"`)
  if (trilha !== 'Registrar dispositivo') {
    erros.push(`A barra do topo não acompanhou a tela: "${trilha}"`)
  }

  // --- 2b. Faixa roxa nos cards de tópico, e o marcado em roxo ---
  const visual = await p.evaluate(() => {
    const card = document.querySelector('[data-grupo-registro="TELEMETRIA"]')
    const faixa = card.firstElementChild
    const titulo = faixa.querySelector('span')
    const marcar = faixa.querySelector('[data-marcar]')
    const caixa = card.querySelector('input[type=checkbox]')
    return {
      fundoDaFaixa: getComputedStyle(faixa).backgroundColor,
      corDoTitulo: getComputedStyle(titulo).color,
      corDoBotao: getComputedStyle(marcar).color,
      accent: getComputedStyle(caixa).accentColor,
      marcada: caixa.checked,
    }
  })
  console.log(`2b. Card do tópico: ${JSON.stringify(visual)}`)
  if (visual.fundoDaFaixa !== 'rgb(126, 32, 101)') {
    erros.push(`A faixa do card deveria ser o roxo da marca: ${visual.fundoDaFaixa}`)
  }
  for (const [onde, cor] of [
    ['título', visual.corDoTitulo],
    ['Todos/Nenhum', visual.corDoBotao],
  ]) {
    if (cor !== 'rgb(255, 255, 255)') erros.push(`"${onde}" deveria ser branco sobre a faixa: ${cor}`)
  }
  if (visual.accent !== 'rgb(126, 32, 101)') {
    erros.push(`O checkbox não herdou o roxo da marca: accent-color ${visual.accent}`)
  }

  // O `accent-color` só vale se a tela pintar mesmo: mede o pixel da caixa
  const caixa = await p.evaluate(() => {
    const el = document.querySelector('[data-grupo-registro="TELEMETRIA"] input[type=checkbox]')
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  })
  await p.waitForTimeout(300)
  const shot = await p.screenshot()
  await p.evaluate(
    (b64) =>
      new Promise((ok) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          c.getContext('2d').drawImage(img, 0, 0)
          window.__ctx = c.getContext('2d')
          window.__esc = img.width / window.innerWidth
          ok()
        }
        img.src = 'data:image/png;base64,' + b64
      }),
    shot.toString('base64'),
  )
  const pixels = await p.evaluate((a) => {
    const e = window.__esc
    const d = window.__ctx.getImageData(
      Math.round(a.x + 1) * e,
      Math.round(a.y + 1) * e,
      Math.round(a.w - 2) * e,
      Math.round(a.h - 2) * e,
    ).data
    let roxos = 0
    let brancos = 0
    let azuis = 0
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
      n++
      if (r > 235 && g > 235 && b > 235) brancos++
      // Roxo/magenta: vermelho e azul acima do verde, vermelho no topo
      else if (r > g + 20 && b > g + 20 && r >= b) roxos++
      // Azul do sistema: azul domina com folga
      else if (b > r + 40 && b > g + 20) azuis++
    }
    return { roxos: +(roxos / n).toFixed(2), brancos: +(brancos / n).toFixed(2), azuis: +(azuis / n).toFixed(2) }
  }, caixa)
  console.log(`2c. Pixels da caixa marcada: ${JSON.stringify(pixels)}`)
  if (pixels.azuis > 0.05) erros.push(`A caixa marcada ainda pinta azul: ${pixels.azuis}`)
  if (pixels.roxos < 0.35) erros.push(`Pouco roxo na caixa marcada: ${pixels.roxos}`)
  if (pixels.brancos < 0.05) erros.push(`O certinho branco não aparece na caixa: ${pixels.brancos}`)

  // --- 3. Configura: nome, ícone, duas linhas fora, um tópico zerado ---
  await p.fill('#nome-tipo', NOME_TIPO)
  await p.click('button[aria-label="Balança"]')

  for (const chave of ['imei1', 'imei2']) {
    await p.uncheck(`input[data-ficha="${chave}"]`)
  }

  // As quatro linhas de identidade e veredito não podem ser desmarcadas
  const fixos = await p.evaluate(() =>
    [...document.querySelectorAll('input[data-ficha]')]
      .filter((i) => i.disabled)
      .map((i) => i.dataset.ficha),
  )
  console.log(`3. Linhas fixas da ficha: ${JSON.stringify(fixos)}`)
  const esperadosFixos = ['homologado', 'fabricante', 'modelo']
  if (JSON.stringify([...fixos].sort()) !== JSON.stringify([...esperadosFixos].sort())) {
    erros.push(`Linhas fixas erradas: ${JSON.stringify(fixos)}`)
  }

  await p.click('[data-grupo-registro="PERFIS"] [data-marcar="nenhum"]')

  const comandos = p.locator('[data-grupo-registro="COMANDOS"]')
  await comandos.locator('[data-novo-item]').fill(ITEM_NOVO)
  await comandos.locator('[data-nova-acao]').fill('Ação escrita junto com o item')
  await comandos.locator('[data-adicionar-item]').click()

  const marcados = await p.evaluate(() =>
    [...document.querySelectorAll('input[data-item-catalogo]')].filter((i) => i.checked).length,
  )
  console.log(`4. Itens do catálogo marcados: ${marcados} (+1 escrito na hora)`)
  if (marcados !== TOTAL - PERFIS) {
    erros.push(`Esperava ${TOTAL - PERFIS} itens marcados depois de zerar Perfis, deu ${marcados}`)
  }

  /** Linhas da ficha oferecidas, menos os dois IMEI que acabaram de sair */
  const FICHA_ESPERADA =
    (await p.evaluate(() => document.querySelectorAll('input[data-ficha]').length)) - 2

  await p.screenshot({ path: `${SAIDA}/91-registro-formulario.png` })

  // --- 5. Registra e cai na planilha do tipo novo ---
  await p.click('button[type=submit]')
  await p.waitForURL(/\/matriz\/zz-verificacao-automatizada/, { timeout: 15000 })
  const slug = new URL(p.url()).pathname.split('/').pop()
  console.log(`5. Criado e redirecionado para /matriz/${slug}`)

  // --- 6. O tipo entrou no menu ---
  await p.waitForTimeout(600)
  const noMenu = await p.evaluate(
    (nome) => [...document.querySelectorAll('aside nav a')].some((a) => a.textContent.trim() === nome),
    NOME_TIPO,
  )
  console.log(`6. Tipo no menu lateral: ${noMenu}`)
  if (!noMenu) erros.push('O tipo registrado não apareceu no menu lateral')

  // --- 7. A planilha do tipo traz só o que foi configurado ---
  const matriz = await api(`/matriz?categoriaSlug=${slug}`)
  const porGrupo = {}
  for (const i of matriz.itens) porGrupo[i.grupo] = (porGrupo[i.grupo] ?? 0) + 1
  console.log(
    `7. Bateria do tipo: ${matriz.itens.length} itens ${JSON.stringify(porGrupo)} | ficha: ${matriz.categoria.camposFicha.length} linhas`,
  )
  if (matriz.itens.length !== NA_BATERIA) {
    erros.push(`A planilha do tipo tem ${matriz.itens.length} itens, esperava ${NA_BATERIA}`)
  }
  if (porGrupo.PERFIS) erros.push(`Perfis foi zerado no registro mas veio com ${porGrupo.PERFIS} itens`)
  if (!matriz.itens.some((i) => i.nome === ITEM_NOVO && i.grupo === 'COMANDOS')) {
    erros.push('O item escrito no registro não foi para Comandos')
  }
  const ficha = matriz.categoria.camposFicha
  if (ficha.length !== FICHA_ESPERADA) {
    erros.push(`A ficha do tipo tem ${ficha.length} linhas, esperava ${FICHA_ESPERADA}`)
  }
  if (ficha.includes('imei1') || ficha.includes('imei2')) {
    erros.push(`IMEI foi desmarcado mas continua na ficha: ${JSON.stringify(ficha)}`)
  }

  // --- 8. O tipo anterior não foi tocado ---
  const pos = await api('/matriz?categoriaSlug=pos')
  console.log(`8. PoS continua com ${pos.itens.length} itens e ${pos.colunas.length} colunas`)
  // Contra o que PoS tinha antes deste roteiro rodar — a invariante é "não
  // mexeu no tipo alheio", não um número gravado aqui
  if (pos.itens.length !== posAntes) {
    erros.push(`A planilha de PoS mudou: ${pos.itens.length} itens, tinha ${posAntes}`)
  }
  // Contra o que PoS tinha antes, e não contra "ficha vazia": o PoS é editável
  // pela tela como qualquer outro tipo, e a invariante é não ter sido mexido
  if (JSON.stringify(pos.categoria.camposFicha) !== fichaPosAntes) {
    erros.push(
      `A ficha de PoS mudou sem pedir: ${JSON.stringify(pos.categoria.camposFicha)} (era ${fichaPosAntes})`,
    )
  }

  // --- 9. Um modelo cadastrado neste tipo herda esta bateria ---
  const bateriaId = (
    await api(`/baterias?categoriaId=${matriz.categoria.id}`)
  )[0].id
  const criado = await p.evaluate(
    async ([bateriaId, categoriaId]) => {
      const r = await fetch('/api/matriz/modelo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('homolog.token')}`,
        },
        body: JSON.stringify({
          categoriaId,
          fabricante: 'Zz Fabricante',
          modelo: 'Zz Modelo',
          nomeComercial: 'Zz Modelo de Verificação',
          bateriaId,
          numeroSerie: 'ZZ-0001',
          versaoSo: 'Android 13',
          gerenciamento: 'ANDROID_LEGADO',
          tipoAgente: 'Agente PoS',
          versaoAgente: '1.0.0',
          metodoInscricao: 'ADB / Arquivo',
          dataInicio: new Date().toISOString().slice(0, 10),
        }),
      })
      return { status: r.status, corpo: await r.json() }
    },
    [bateriaId, matriz.categoria.id],
  )
  if (criado.status !== 201) {
    erros.push(`Não deu para cadastrar o modelo no tipo novo: ${JSON.stringify(criado.corpo)}`)
  }
  const resultados = criado.corpo?.homologacoes?.[0]?.resultados?.length
  console.log(`9. Modelo cadastrado com ${resultados} resultados abertos`)
  if (resultados !== NA_BATERIA) {
    erros.push(`O modelo herdou ${resultados} linhas, esperava as ${NA_BATERIA} da bateria`)
  }

  // --- 10. E a planilha desenha exatamente essas linhas ---
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(700)

  const desenhado = await p.evaluate(() => ({
    // A primeira linha do thead é a faixa dos modelos; as demais são a ficha
    ficha: document.querySelectorAll('thead tr').length - 1,
    itens: document.querySelectorAll('tbody tr').length,
    grupos: [...document.querySelectorAll('tbody[data-grupo]')].map((t) => t.dataset.grupo),
  }))
  console.log(
    `10. Planilha desenhada: ${desenhado.ficha} linhas de ficha, ${desenhado.itens} itens, grupos ${JSON.stringify(desenhado.grupos)}`,
  )
  if (desenhado.ficha !== FICHA_ESPERADA) {
    erros.push(`A ficha desenhou ${desenhado.ficha} linhas, esperava ${FICHA_ESPERADA}`)
  }
  if (desenhado.itens !== NA_BATERIA) {
    erros.push(`O corpo desenhou ${desenhado.itens} linhas, esperava ${NA_BATERIA}`)
  }
  if (desenhado.grupos.includes('PERFIS')) erros.push('O rail ainda mostra o grupo Perfis, que foi zerado')

  // --- 11. O menu de seções não oferece tópico vazio ---
  const menuSecoes = p.locator('thead tr th').first().locator('[data-menu-coluna]')
  await menuSecoes.click()
  await p.waitForSelector('[data-menu-aberto]')
  const secoes = (await p.locator('[data-menu-aberto] button').allTextContents()).map((t) => t.trim())
  await p.keyboard.press('Escape')
  console.log(`11. Seções oferecidas: ${JSON.stringify(secoes)}`)
  if (secoes.some((s) => s.includes('Perfil'))) {
    erros.push('O menu de seções ainda oferece "Perfil", que não tem linha neste tipo')
  }
  if (secoes.length !== 5) erros.push(`Esperava 5 seções neste tipo, veio ${secoes.length}`)

  await p.screenshot({ path: `${SAIDA}/92-registro-planilha.png` })

  // --- 12. A tela de manutenção lista o tipo ---
  await p.goto('http://localhost:8080/registro/tipos', { waitUntil: 'networkidle' })
  await p.waitForSelector(`[data-tipo="${slug}"]`)
  const linha = p.locator(`[data-tipo="${slug}"]`)
  console.log(`12. Na lista: "${(await linha.textContent()).replace(/\s+/g, ' ').trim()}"`)

  // Com um modelo cadastrado, apagar tem de estar fora de alcance
  const apagarTravado = await linha.locator('[data-acao="Apagar"]').isDisabled()
  console.log(`12b. "Apagar" travado com 1 modelo: ${apagarTravado}`)
  if (!apagarTravado) erros.push('"Apagar" ficou disponível num tipo com modelo cadastrado')

  // E o backend recusa mesmo que se force por fora
  const forcado = await p.evaluate(
    (id) =>
      fetch(`/api/tipos-dispositivo/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
      }).then(async (r) => ({ status: r.status, corpo: await r.json().catch(() => null) })),
    matriz.categoria.id,
  )
  console.log(`12c. DELETE forçado: HTTP ${forcado.status}`)
  if (forcado.status !== 409) {
    erros.push(`O backend deveria recusar apagar tipo com modelo: HTTP ${forcado.status}`)
  }

  // --- 13. Editar devolve Perfis à bateria, e as homologações abertas seguem ---
  await linha.locator('[data-acao="Editar"]').click()
  await p.waitForURL(/\/registro\/tipos\/[0-9a-f-]{36}/)
  await p.waitForSelector('[data-grupo-registro="PERFIS"] input[type=checkbox]')
  await p.waitForTimeout(400)

  const veioMarcado = await p.evaluate(() =>
    [...document.querySelectorAll('input[data-item-catalogo]')].filter((i) => i.checked).length,
  )
  const fichaMarcada = await p.evaluate(() =>
    [...document.querySelectorAll('input[data-ficha]')].filter((i) => i.checked).length,
  )
  console.log(`13. Edição abriu com ${veioMarcado} itens e ${fichaMarcada} linhas marcadas`)
  // O item escrito no registro já virou catálogo e conta junto
  if (veioMarcado !== NA_BATERIA) {
    erros.push(`A edição abriu com ${veioMarcado} itens marcados, esperava ${NA_BATERIA}`)
  }
  if (fichaMarcada !== FICHA_ESPERADA) {
    erros.push(`A edição abriu com ${fichaMarcada} linhas de ficha, esperava ${FICHA_ESPERADA}`)
  }

  await p.click('[data-grupo-registro="PERFIS"] [data-marcar="todos"]')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/registro/tipos')
  await p.waitForTimeout(600)

  // A volta tem de contar o que a edição fez: sem isso, uma edição que não
  // mexe na planilha (porque o item tem histórico) parece uma que não salvou
  const aviso = await p.evaluate(() => {
    const el = document.querySelector('[role=status]')
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null
  })
  console.log(`13a. Aviso da edição: ${aviso ? `"${aviso}"` : 'NENHUM'}`)
  if (!aviso) erros.push('A edição voltou calada — nada explica o que ela fez')
  else if (!new RegExp(`${PERFIS} itens entraram`).test(aviso)) {
    erros.push(`O aviso não diz que ${PERFIS} itens entraram: "${aviso}"`)
  }

  const depois = await api(`/matriz?categoriaSlug=${slug}`)
  const pendentes = depois.colunas[0].homologacao.resultados.filter(
    (r) => r.status === 'NAO_TESTADO',
  ).length
  console.log(
    `13b. Depois de editar: ${depois.itens.length} itens na planilha | ${depois.colunas[0].homologacao.resultados.length} resultados, ${pendentes} pendentes`,
  )
  const COMPLETA = NA_BATERIA + PERFIS
  if (depois.itens.length !== COMPLETA) {
    erros.push(`Devolver Perfis deveria dar ${COMPLETA} itens, deu ${depois.itens.length}`)
  }
  // A homologação aberta acompanha: os de Perfis entraram como pendentes
  if (depois.colunas[0].homologacao.resultados.length !== COMPLETA) {
    erros.push(
      `A homologação aberta ficou com ${depois.colunas[0].homologacao.resultados.length} linhas, esperava ${COMPLETA}`,
    )
  }

  // --- 14. Desativar tira do menu; reativar devolve ---
  await p.locator(`[data-tipo="${slug}"] [data-acao="Desativar"]`).click()
  await p.waitForTimeout(800)
  const sumiu = await p.evaluate(
    (s) => ![...document.querySelectorAll('aside nav a')].some((a) => a.getAttribute('href') === `/matriz/${s}`),
    slug,
  )
  console.log(`14. Desativado sai do menu: ${sumiu}`)
  if (!sumiu) erros.push('O tipo desativado continuou no menu lateral')

  await p.locator(`[data-tipo="${slug}"] [data-acao="Reativar"]`).click()
  await p.waitForTimeout(800)
  const voltou = await p.evaluate(
    (s) => [...document.querySelectorAll('aside nav a')].some((a) => a.getAttribute('href') === `/matriz/${s}`),
    slug,
  )
  console.log(`14b. Reativado volta ao menu: ${voltou}`)
  if (!voltou) erros.push('O tipo reativado não voltou ao menu lateral')

  // --- 14c. Retirar da bateria não apaga trabalho de bancada ---
  //
  // É a regra mais delicada da edição: tirar um item do tipo tem de limpar as
  // linhas pendentes das homologações abertas, MAS preservar o que o técnico
  // já avaliou. Marcar e tirar é a única forma de provar isso.
  const homId = depois.colunas[0].homologacao.id
  const perfis = depois.itens.filter((i) => i.grupo === 'PERFIS')
  const avaliado = perfis[0]
  await p.evaluate(
    async ([homId, itemId]) => {
      await fetch(`/api/homologacoes/${homId}/resultados/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('homolog.token')}`,
        },
        body: JSON.stringify({
          status: 'OK',
          observacao: null,
          justificativaId: null,
          justificativaTexto: null,
        }),
      })
    },
    [homId, avaliado.id],
  )

  const semPerfis = depois.itens.filter((i) => i.grupo !== 'PERFIS').map((i) => i.id)
  const edicao = await p.evaluate(
    async ([id, itens]) => {
      const r = await fetch(`/api/tipos-dispositivo/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('homolog.token')}`,
        },
        body: JSON.stringify({ itensExistentes: itens, itensNovos: [] }),
      })
      return { status: r.status, corpo: await r.json() }
    },
    [matriz.categoria.id, semPerfis],
  )
  console.log(
    `14c. Tirando Perfis: HTTP ${edicao.status} | removidos ${edicao.corpo.removidos} | preservados ${JSON.stringify(edicao.corpo.preservados)}`,
  )
  if (edicao.corpo.removidos !== PERFIS) {
    erros.push(`Esperava ${PERFIS} itens de Perfis fora da bateria, deu ${edicao.corpo.removidos}`)
  }
  if (JSON.stringify(edicao.corpo.preservados) !== JSON.stringify([avaliado.nome])) {
    erros.push(
      `A edição deveria preservar só "${avaliado.nome}": ${JSON.stringify(edicao.corpo.preservados)}`,
    )
  }
  // A planilha responde na hora: nenhuma linha de Perfis sobra, nem a do item
  // avaliado — tirar da bateria tira da tela.
  const conferida = await api(`/matriz?categoriaSlug=${slug}`)
  const sobrouNaTela = conferida.itens.filter((i) => i.grupo === 'PERFIS')
  const sobrouResultado = conferida.colunas[0].homologacao.resultados.filter((r) =>
    perfis.some((i) => i.id === r.itemId),
  )
  console.log(
    `14d. Planilha depois: ${conferida.itens.length} linhas | de Perfis: ${sobrouNaTela.length} | resultados de Perfis expostos: ${sobrouResultado.length}`,
  )
  if (sobrouNaTela.length) {
    erros.push(`Perfis saiu da bateria mas ${sobrouNaTela.length} linha(s) ficaram na planilha`)
  }
  if (sobrouResultado.length) {
    erros.push('Resultado de item fora da bateria vazou para a matriz')
  }

  // Mas o que foi avaliado continua no banco, pronto para voltar
  const guardado = await prisma.resultado.findFirst({
    where: { homologacaoId: homId, itemId: avaliado.id },
    select: { status: true },
  })
  console.log(`14e. "${avaliado.nome}" guardado no banco: ${guardado?.status ?? 'NÃO'}`)
  if (guardado?.status !== 'OK') {
    erros.push(`O resultado avaliado foi destruído pela edição: ${JSON.stringify(guardado)}`)
  }

  // --- 15. Tipo sem modelo pode ser apagado de verdade ---
  const vazio = await p.evaluate(async () => {
    const cab = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('homolog.token')}`,
    }
    const criar = await fetch('/api/tipos-dispositivo', {
      method: 'POST',
      headers: cab,
      body: JSON.stringify({
        nome: 'Zz Verificacao Descartavel',
        icone: 'caixa',
        camposFicha: [],
        itensExistentes: [],
        itensNovos: [{ grupo: 'COLETA', nome: 'Zz item descartavel', descricaoAcao: 'nada' }],
      }),
    })
    const corpo = await criar.json()
    // Sem `Content-Type` no DELETE: o Fastify recusa corpo vazio declarado
    // como JSON, e este pedido não tem corpo nenhum
    const apagar = await fetch(`/api/tipos-dispositivo/${corpo.categoria.id}`, {
      method: 'DELETE',
      headers: { Authorization: cab.Authorization },
    })
    return {
      criou: criar.status,
      apagou: apagar.status,
      motivo: apagar.status === 204 ? null : await apagar.text(),
    }
  })
  console.log(`15. Tipo vazio: criado HTTP ${vazio.criou}, apagado HTTP ${vazio.apagou} ${vazio.motivo ?? ''}`)
  if (vazio.criou !== 201) erros.push(`Não criou o tipo descartável: HTTP ${vazio.criou}`)
  if (vazio.apagou !== 204) erros.push(`Tipo sem modelo deveria apagar: HTTP ${vazio.apagou}`)

  await p.screenshot({ path: `${SAIDA}/93-gerenciar-tipos.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-registro-tipo.png` }).catch(() => {})
} finally {
  await nav.close()
  const apagados = await limpar()
  console.log(`\nLimpeza: ${apagados} tipo(s) de verificação removido(s)`)
  await prisma.$disconnect()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
