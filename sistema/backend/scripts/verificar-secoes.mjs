/**
 * Menu de seções ao lado de "Homologação": recorta as LINHAS da planilha sem
 * tocar nas colunas de modelo. E o nome do modelo, centralizado na coluna.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

/**
 * Quantas linhas cada seção mostra.
 *
 * Vem da API, não gravado aqui: a bateria do tipo é editável pela tela de
 * registro, então "Comandos tem 16" deixou de ser constante — o roteiro
 * quebraria toda vez que alguém configurasse o PoS. O que se verifica é a
 * relação: cada seção recorta exatamente o seu pedaço, e "Todos" é a soma.
 */
const GRUPO_DA_SECAO = {
  '2. Monitoramento': 'TELEMETRIA',
  '3. Informações': 'COLETA',
  '4. Comandos': 'COMANDOS',
  '5. Perfil': 'PERFIS',
}

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

/** Rótulos das linhas visíveis, ficha e itens juntos */
const linhasVisiveis = () =>
  p.evaluate(
    () =>
      [...document.querySelectorAll('thead tr'), ...document.querySelectorAll('tbody tr')]
        .slice(1)
        .map((tr) => tr.querySelector('th')?.textContent.trim() ?? '')
        .filter(Boolean).length,
  )

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz/pos', { waitUntil: 'networkidle' })
  await p.waitForSelector('thead th[data-modelo]')
  await p.waitForTimeout(900)

  // Contagens da configuração atual do PoS
  const matriz = await p.evaluate(() =>
    fetch('/api/matriz?categoriaSlug=pos', {
      headers: { Authorization: `Bearer ${localStorage.getItem('homolog.token')}` },
    }).then((r) => r.json()),
  )
  const porGrupo = {}
  for (const i of matriz.itens) porGrupo[i.grupo] = (porGrupo[i.grupo] ?? 0) + 1
  const naFicha = await p.evaluate(() => document.querySelectorAll('thead tr').length - 1)
  const SECOES = [
    ['1. Registro', naFicha],
    ...Object.entries(GRUPO_DA_SECAO).map(([rotulo, g]) => [rotulo, porGrupo[g] ?? 0]),
    ['6. Todos', naFicha + matriz.itens.length],
  ]
  console.log(`0. Configuração do PoS: ficha ${naFicha} | itens ${JSON.stringify(porGrupo)}`)

  // --- 1. O subtítulo saiu e o menu entrou ---
  const cabecalho = await p.evaluate(() => {
    const th = document.querySelector('thead tr th')
    return {
      texto: th.textContent.trim(),
      temMenu: !!th.querySelector('[data-menu-coluna]'),
      altura: Math.round(th.getBoundingClientRect().height),
    }
  })
  console.log(`1. Coluna da esquerda: "${cabecalho.texto}" | menu: ${cabecalho.temMenu} | ${cabecalho.altura}px`)
  if (cabecalho.texto !== 'Homologação') {
    erros.push(`O subtítulo ainda está no cabeçalho: "${cabecalho.texto}"`)
  }
  if (!cabecalho.temMenu) erros.push('Falta o menu de seções ao lado de "Homologação"')

  // --- 2. Ordem numerada do menu ---
  const menuEsquerda = p.locator('thead tr th').first().locator('[data-menu-coluna]')
  await menuEsquerda.click()
  await p.waitForSelector('[data-menu-aberto]')
  const opcoes = (await p.locator('[data-menu-aberto] button').allTextContents()).map((t) => t.trim())
  await p.keyboard.press('Escape')
  console.log(`2. Seções: ${JSON.stringify(opcoes)}`)
  const esperado = SECOES.map(([r]) => r)
  if (JSON.stringify(opcoes) !== JSON.stringify(esperado)) {
    erros.push(`Menu de seções fora da ordem: ${JSON.stringify(opcoes)}`)
  }

  // --- 3. Cada seção recorta as linhas, e só elas ---
  const colunasAntes = await p.locator('thead th[data-modelo]').count()
  for (const [rotulo, esperadas] of SECOES) {
    await menuEsquerda.click()
    await p.waitForSelector('[data-menu-aberto]')
    await p.locator('[data-menu-aberto] button', { hasText: rotulo }).click()
    await p.waitForTimeout(500)
    const linhas = await linhasVisiveis()
    const colunas = await p.locator('thead th[data-modelo]').count()
    console.log(`3. ${rotulo}: ${linhas} linha(s), ${colunas} coluna(s)`)
    if (linhas !== esperadas) erros.push(`"${rotulo}" mostrou ${linhas} linhas, esperava ${esperadas}`)
    // O recorte é de linhas: as colunas de modelo não podem mudar
    if (colunas !== colunasAntes) {
      erros.push(`"${rotulo}" mexeu nas colunas: ${colunasAntes} → ${colunas}`)
    }
  }

  // --- 4. Nome do modelo inteiro e centrado no espaço livre ---
  //
  // "Centrado na coluna" e "nome inteiro" não cabem juntos: o hambúrguer ocupa
  // um dos lados. O que se exige é o nome completo — nunca cortado — e centrado
  // no que sobra ao lado do botão.
  const nomes = await p.evaluate(() =>
    [...document.querySelectorAll('thead th[data-modelo]')].map((th) => {
      const nome = th.querySelector('[data-nome-modelo]')
      // O espaço livre é a caixa flex — o `pr-7` acima dela ainda inclui o
      // padding reservado ao botão
      const caixa = nome.parentElement
      const rc = caixa.getBoundingClientRect()
      const rn = nome.getBoundingClientRect()
      return {
        modelo: th.dataset.modelo,
        cortado: nome.scrollWidth > nome.clientWidth + 1,
        desvio: Math.round(rn.left + rn.width / 2 - (rc.left + rc.width / 2)),
        menuADireita: (() => {
          const m = th.querySelector('[data-menu-coluna]').getBoundingClientRect()
          return Math.round(th.getBoundingClientRect().right - m.right)
        })(),
      }
    }),
  )
  const cortados = nomes.filter((n) => n.cortado)
  console.table(nomes.slice(0, 4))
  console.log(`4b. Nomes cortados: ${cortados.length ? JSON.stringify(cortados.map((n) => n.modelo)) : 'nenhum'}`)
  if (cortados.length) {
    erros.push(`Nome de modelo cortado: ${cortados.map((n) => n.modelo).join(', ')}`)
  }
  for (const n of nomes) {
    if (Math.abs(n.desvio) > 2) {
      erros.push(`"${n.modelo}" fora do centro do espaço livre por ${n.desvio}px`)
    }
    if (n.menuADireita > 12) erros.push(`O menu de "${n.modelo}" descolou da direita`)
  }

  // --- 5. Nomes na mesma altura de "Homologação" e centrados na faixa ---
  const alturas = await p.evaluate(() => {
    const th = document.querySelector('thead tr th')
    const titulo = th.querySelector('span')
    const rt = titulo.getBoundingClientRect()
    const centro = (el) => {
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    }
    return {
      // Cada nome de modelo contra o "Homologação" da esquerda
      desvios: [...document.querySelectorAll('thead th[data-nome-modelo], thead [data-nome-modelo]')]
        .slice(0, 5)
        .map((n) => Math.round(centro(n) - centro(titulo))),
      // E o texto centrado na altura do hambúrguer ao lado
      contraOMenu: Math.round(centro(titulo) - centro(th.querySelector('[data-menu-coluna]'))),
      topoDoTitulo: Math.round(rt.top),
    }
  })
  console.log(`5. Alturas — desvios dos nomes: ${JSON.stringify(alturas.desvios)} | contra o hambúrguer: ${alturas.contraOMenu}px`)
  if (alturas.desvios.some((d) => Math.abs(d) > 1)) {
    erros.push(`Nomes fora da altura de "Homologação": ${JSON.stringify(alturas.desvios)}`)
  }
  if (Math.abs(alturas.contraOMenu) > 1) {
    erros.push(`O texto não está centrado contra o hambúrguer: ${alturas.contraOMenu}px`)
  }

  // --- 6. Fio branco separando as colunas, uniforme nos 32 th ---
  const fio = await p.evaluate(() =>
    [...document.querySelectorAll('thead tr')[0].children].map(
      (th) => getComputedStyle(th).boxShadow,
    ),
  )
  const distintos = [...new Set(fio)]
  console.log(`6. Fio entre colunas: ${JSON.stringify(distintos)}`)
  if (distintos.length !== 1) {
    erros.push(`O fio não é uniforme na faixa: ${JSON.stringify(distintos)}`)
  }
  if (!distintos[0]?.includes('inset') || !/rgba\(255, 255, 255/.test(distintos[0] ?? '')) {
    erros.push(`O fio entre colunas deveria ser branco e interno: ${distintos[0]}`)
  }
  if (!distintos[0]?.includes('-1px 0px')) {
    erros.push(`O fio deveria ser de 1px, à direita: ${distintos[0]}`)
  }
  // E outro fio branco fechando a base da faixa
  if (!/0px -1px/.test(distintos[0] ?? '')) {
    erros.push(`Falta o fio branco na base da faixa: ${distintos[0]}`)
  }

  // --- 7. A faixa tem de sobreviver ao scroll ---
  // Era o bug: com `border-collapse`, a borda pertence à tabela e ficava para
  // trás enquanto o cabeçalho sticky seguia colado. Só pixel prova.
  await p.mouse.move(800, 500)
  await p.mouse.wheel(0, 900)
  await p.waitForTimeout(600)

  const png = await p.screenshot()
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
    png.toString('base64'),
  )

  const aposScroll = await p.evaluate(() => {
    const th = document.querySelector('thead tr th')
    const r = th.getBoundingClientRect()
    const e = window.__esc
    const roxo = (i, d) =>
      d[i] < 140 && d[i + 1] < 80 && d[i + 2] < 130 && d[i] > d[i + 1] && d[i + 2] > d[i + 1]

    // Tira a 3px do topo da faixa, atravessando 5 colunas: acima do texto e
    // dos botões, ali só existe o degradê. Se o cabeçalho sticky perdesse a
    // pintura, apareceria o branco das células de baixo.
    const d = window.__ctx.getImageData(
      Math.round(r.left + 4) * e,
      Math.round(r.top + 3) * e,
      Math.round(r.width * 5) * e,
      1,
    ).data
    let roxos = 0
    let total = 0
    for (let i = 0; i < d.length; i += 4) {
      total++
      if (roxo(i, d)) roxos++
    }
    return { fracaoRoxa: +(roxos / total).toFixed(2) }
  })
  console.log(`7. Depois de rolar — fração roxa na faixa: ${aposScroll.fracaoRoxa}`)
  if (aposScroll.fracaoRoxa < 0.9) {
    erros.push(`A faixa perde a pintura ao rolar: só ${aposScroll.fracaoRoxa} está roxa`)
  }

  // --- 8. Degradê do botão "Entrar", contínuo entre as colunas ---
  const faixa = await p.evaluate(() => {
    const ths = [...document.querySelectorAll('thead tr')[0].children]
    const s = getComputedStyle(ths[0])
    return {
      imagem: s.backgroundImage,
      // Cada coluna recorta a MESMA imagem, deslocada pelo próprio x: é isso
      // que faz a faixa ler como um degradê só, e não como 32 seguidos
      tamanhos: [...new Set(ths.map((th) => getComputedStyle(th).backgroundSize))],
      posicoes: ths.slice(0, 4).map((th) => getComputedStyle(th).backgroundPosition),
      largura: Math.round(document.querySelector('table').getBoundingClientRect().width),
    }
  })
  console.log(`8. Fundo: ${faixa.imagem.slice(0, 84)}`)
  console.log(`8b. Tamanho: ${JSON.stringify(faixa.tamanhos)} (tabela ${faixa.largura}px) | posições: ${JSON.stringify(faixa.posicoes)}`)
  const paradas = (faixa.imagem.match(/rgb\([^)]+\)/g) ?? []).map((c) => c.match(/\d+/g).map(Number))
  if (paradas.length !== 3) erros.push(`O degradê deveria ter três paradas: ${paradas.length}`)
  // As mesmas três do botão "Entrar" do login
  const esperadas = [
    [110, 34, 107],
    [126, 32, 101],
    [74, 18, 64],
  ]
  if (JSON.stringify(paradas) !== JSON.stringify(esperadas)) {
    erros.push(`O degradê não é o do botão "Entrar": ${JSON.stringify(paradas)}`)
  }
  if (faixa.tamanhos.length !== 1) {
    erros.push(`Colunas com escalas diferentes do degradê: ${JSON.stringify(faixa.tamanhos)}`)
  }
  if (Math.abs(parseFloat(faixa.tamanhos[0]) - faixa.largura) > 2) {
    erros.push(`O degradê não cobre a tabela inteira: ${faixa.tamanhos[0]} vs ${faixa.largura}px`)
  }
  // Posições crescentes: cada coluna pega o seu trecho
  const xs = faixa.posicoes.map((p) => parseFloat(p))
  if (!xs.every((x, i) => i === 0 || x < xs[i - 1])) {
    erros.push(`As colunas não deslocam o degradê em sequência: ${JSON.stringify(faixa.posicoes)}`)
  }

  // --- 9. Texto e traço do menu em branco sobre o roxo ---
  const brancos = await p.evaluate(() => {
    const th = document.querySelector('thead tr th')
    const modelo = document.querySelector('thead th[data-modelo]')
    return {
      titulo: getComputedStyle(th.querySelector('span')).color,
      nome: getComputedStyle(modelo.querySelector('[data-nome-modelo]')).color,
      menu: getComputedStyle(th.querySelector('[data-menu-coluna]')).color,
    }
  })
  console.log(`9. Cores sobre a faixa: ${JSON.stringify(brancos)}`)
  for (const [onde, cor] of Object.entries(brancos)) {
    if (cor !== 'rgb(255, 255, 255)') erros.push(`"${onde}" deveria ser branco na faixa: ${cor}`)
  }

  // --- 10. As opções do menu têm de ser legíveis ---
  // O menu é filho do `th` da faixa, que define texto branco: sem `color`
  // próprio, as opções ficam brancas sobre o fundo branco do menu e só
  // aparecem no destaque do hover.
  await menuEsquerda.click()
  await p.waitForSelector('[data-menu-aberto]')
  const legibilidade = await p.evaluate(() => {
    const menu = document.querySelector('[data-menu-aberto]')
    const fundo = getComputedStyle(menu).backgroundColor
    const lum = (c) =>
      c
        .match(/\d+/g)
        .slice(0, 3)
        .map((v) => {
          const x = v / 255
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
    const lf = lum(fundo)
    return [...menu.querySelectorAll('button')].map((b) => {
      const cor = getComputedStyle(b).color
      const l = lum(cor)
      return {
        rotulo: b.textContent.trim(),
        contraste: +((Math.max(l, lf) + 0.05) / (Math.min(l, lf) + 0.05)).toFixed(1),
      }
    })
  })
  await p.keyboard.press('Escape')
  console.log(`10. Contraste das opções: ${JSON.stringify(legibilidade)}`)
  const apagadas = legibilidade.filter((o) => o.contraste < 4.5)
  if (apagadas.length) {
    erros.push(`Opções ilegíveis no menu: ${JSON.stringify(apagadas)}`)
  }

  // --- 11. Rail vertical com o mesmo degradê e texto branco ---
  const rail = await p.evaluate(() => {
    const td = document.querySelector('tbody td[rowspan]')
    if (!td) return null
    const s = getComputedStyle(td)
    const rotulo = td.querySelector('span')
    return {
      fundo: s.backgroundColor,
      degrade: s.backgroundImage,
      cor: getComputedStyle(rotulo).color,
      tamanho: getComputedStyle(rotulo).fontSize,
    }
  })
  console.log(`11. Rail: ${JSON.stringify(rail)}`)
  if (!rail) erros.push('O rail vertical sumiu da matriz')
  else {
    // Roxo chapado: o degradê é da faixa do topo, não daqui
    if (rail.degrade !== 'none') erros.push(`O degradê voltou ao rail: ${rail.degrade}`)
    if (rail.fundo !== 'rgb(110, 34, 107)') {
      erros.push(`O rail deveria ser o roxo da ponta esquerda da faixa: ${rail.fundo}`)
    }
    if (rail.cor !== 'rgb(255, 255, 255)') erros.push(`Rótulo do rail não está branco: ${rail.cor}`)
    // Mesmo corpo do nome do modelo na faixa
    if (rail.tamanho !== '13px') erros.push(`Rótulo do rail fora do corpo da faixa: ${rail.tamanho}`)
  }

  await p.screenshot({ path: `${SAIDA}/87-secoes.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-secoes.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
