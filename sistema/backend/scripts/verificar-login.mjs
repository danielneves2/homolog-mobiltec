/**
 * Tela de login: painel de marca (cor base, textura, logo branca) e o lado
 * branco (sem mancha laranja, botão sem gradiente).
 *
 * As duas afirmações visuais que não dá para checar por CSS — "a textura
 * some antes da metade" e "não sobrou laranja no canto" — são medidas em
 * pixel: o screenshot volta para dentro da página, vira canvas e é lido com
 * `getImageData`.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const LARGURA = 1600
const ALTURA = 950
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: LARGURA, height: ALTURA } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

/** Lê os pixels do screenshot dentro do próprio browser. */
async function lerPixels() {
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
          window.__esc = img.width / window.innerWidth // devicePixelRatio efetivo
          ok()
        }
        img.src = 'data:image/png;base64,' + b64
      }),
    png.toString('base64'),
  )
}

/**
 * Maior salto entre pixels vizinhos num trecho de coluna vertical.
 *
 * Duas escolhas deliberadas:
 * - **Salto entre vizinhos**, não amplitude (max − min): o próprio gradiente
 *   do painel varia ao longo do trecho. A linha da malha é um degrau de 1px,
 *   e é isso que a separa da rampa.
 * - **Coluna**, não linha: o texto ocupa a largura útil do painel, mas nunca
 *   entra no padding lateral — então uma coluna ali só cruza a malha.
 */
const contrasteNaColuna = (x, y0, y1) =>
  p.evaluate(
    ([x, y0, y1]) => {
      const e = window.__esc
      const img = window.__ctx.getImageData(x * e, y0 * e, 1, (y1 - y0) * e)
      const d = img.data
      const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      let pior = 0
      let linhas = 0
      for (let i = 4; i < d.length; i += 4) {
        const salto = Math.abs(lum(i) - lum(i - 4))
        if (salto > pior) pior = salto
        // 4 separa a linha da malha (~10) do banding do gradiente (~2)
        if (salto > 4) linhas++
      }
      return { pior: +pior.toFixed(1), linhas }
    },
    [x, y0, y1],
  )

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `${SAIDA}/40-login.png` })

  // --- 0. Tela dividida de ponta a ponta, sem moldura em volta ---
  // O usuário reprovou tanto o cartão centralizado quanto a moldura roxa:
  // o painel roxo tem de sangrar até a borda do navegador.
  const sangra = await p.locator('[data-textura]').evaluate((el) => {
    const r = el.parentElement.getBoundingClientRect()
    const barra = document.querySelector('[data-barra-topo]')?.getBoundingClientRect()
    return {
      esquerda: Math.round(r.left),
      topo: Math.round(r.top),
      // O painel encosta na barra de marca, não mais no topo da janela: o que
      // não pode é sobrar fundo entre as duas.
      sobBarra: barra ? Math.round(r.top - barra.bottom) : null,
    }
  })
  console.log(`0. Painel roxo encostado na borda: ${JSON.stringify(sangra)}`)
  if (sangra.esquerda !== 0 || sangra.sobBarra !== 0) {
    erros.push(`O painel roxo deveria sangrar até a borda: ${JSON.stringify(sangra)}`)
  }

  // --- 0b. O cartão do formulário existe, com borda e fio de marca ---
  const cartaoForm = await p.locator('form').evaluate((el) => {
    const s = getComputedStyle(el)
    const fio = el.firstElementChild
    return {
      borda: parseFloat(s.borderTopWidth),
      raio: parseFloat(s.borderTopLeftRadius),
      sombra: s.boxShadow !== 'none',
      alturaDoFio: Math.round(fio.getBoundingClientRect().height),
      fioLaranja: getComputedStyle(fio).backgroundImage.includes('rgb(243, 120, 4)'),
    }
  })
  console.log(`0b. Cartão do formulário: ${JSON.stringify(cartaoForm)}`)
  if (cartaoForm.borda < 1 || cartaoForm.raio < 6 || !cartaoForm.sombra) {
    erros.push('O formulário voltou a ficar sem cartão próprio')
  }
  if (!cartaoForm.fioLaranja || cartaoForm.alturaDoFio > 6) {
    erros.push(`O fio laranja do cartão do formulário sumiu: ${JSON.stringify(cartaoForm)}`)
  }

  // --- 1. Rodapé removido ---
  const corpo = await p.locator('body').textContent()
  const temRodape = /Documento t[eé]cnico confidencial/i.test(corpo)
  console.log(`1. Rodapé "Documento técnico confidencial": ${temRodape ? 'AINDA ESTÁ LÁ' : 'removido'}`)
  if (temRodape) erros.push('O texto do rodapé ainda aparece no painel roxo')

  // --- 2. Painel roxo sem logo: a marca vive no cartão do formulário ---
  const painel = p.locator('[data-textura]').locator('..')
  const nLogoPainel = await painel.locator('img[alt="Mobiltec"]').count()
  console.log(`2. Logos dentro do painel roxo: ${nLogoPainel} (esperado 0)`)
  if (nLogoPainel !== 0) erros.push(`O painel roxo deveria ficar sem logo, achei ${nLogoPainel}`)

  // --- 3. O roxo original: brand-purple → primary → brand-purple-deep ---
  const fundo = await painel.evaluate((el) => getComputedStyle(el).backgroundImage)
  const paradas = ['rgb(110, 34, 107)', 'rgb(126, 32, 101)', 'rgb(74, 18, 64)']
  const faltando = paradas.filter((c) => !fundo.includes(c))
  console.log(`3. Paradas do gradiente roxo presentes: ${paradas.length - faltando.length}/3`)
  if (faltando.length) erros.push(`O gradiente roxo mudou — faltam ${faltando.join(', ')}`)

  // --- 4. Textura: forte no topo, sumida na metade ---
  await lerPixels()
  // Coluna dentro do padding esquerdo do painel: nenhum texto chega ali.
  const cx = await painel.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.left + 12),
      y0: Math.round(r.top + 4),
      fim: Math.round(r.top + r.height * 0.45),
      inicio: Math.round(r.top + r.height * 0.62),
      y1: Math.round(r.bottom - 4),
    }
  })
  const topo = await contrasteNaColuna(cx.x, cx.y0, cx.fim)
  const baixo = await contrasteNaColuna(cx.x, cx.inicio, cx.y1)
  console.log(
    `4. Malha — cima: ${topo.linhas} linha(s), salto ${topo.pior} | baixo: ${baixo.linhas} linha(s), salto ${baixo.pior}`,
  )
  // A malha precisa existir no topo e ter sumido embaixo. O teto de 16 é o
  // que uma linha de 1px com 7% de branco produz sobre o roxo — acima disso
  // vira grade desenhada em vez de textura.
  if (topo.linhas < 2) erros.push(`Malha invisível no topo do painel (${topo.linhas} linhas)`)
  if (topo.pior > 16) erros.push(`Malha forte demais no topo (salto ${topo.pior})`)
  if (baixo.linhas > 0) erros.push(`A malha não sumiu na metade de baixo (${baixo.linhas} linhas)`)

  // --- 5. Laranja só nos fios de marca, nunca como mancha ---
  // Pixel não serve aqui: o texto tem antialiasing subpixel, que produz
  // desvio quente onde não há cor nenhuma. O que dá para afirmar sem ruído é
  // que nada além dos fios finos pinta laranja.
  const pintamLaranja = await p.evaluate(() =>
    [...document.querySelectorAll('*')]
      // O "4" do nome do produto pinta laranja de propósito, e é um glifo,
      // não uma superfície — fica fora desta varredura
      .filter((el) => !el.closest('[data-produto]'))
      .filter((el) => {
        const s = getComputedStyle(el)
        return (
          s.backgroundImage.includes('rgb(243, 120, 4)') ||
          s.backgroundColor === 'rgb(243, 120, 4)'
        )
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        altura: Math.round(el.getBoundingClientRect().height),
      })),
  )
  const manchas = pintamLaranja.filter((e) => e.altura > 6)
  console.log(`5. Elementos com laranja: ${JSON.stringify(pintamLaranja)}`)
  if (manchas.length) erros.push(`Laranja fora dos fios finos: ${JSON.stringify(manchas)}`)
  if (pintamLaranja.length === 0) erros.push('Os fios de marca laranja sumiram')

  // --- 5a. Nome do produto: tom sobre tom, separado do fundo pela sombra ---
  const produto = await p.locator('[data-produto]').evaluate((el) => {
    const s = getComputedStyle(el)
    const quatro = el.querySelector('span')
    const sq = getComputedStyle(quatro)
    const h1 = document.querySelector('h1')
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
        const x = v / 255
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const caixa = (el) => {
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const sub = h1.parentElement.querySelector('p:not([data-produto])')
    const r = el.getBoundingClientRect()
    return {
      corDoTexto: s.color,
      corDoQuatro: sq.color,
      // Uma tira acima da marca, no painel puro: é o fundo real dela agora
      caixaDoFundo: { x: Math.round(r.left), y: Math.round(r.top) - 14, w: Math.round(r.width), h: 8 },
      caixaDoQuatro: caixa(quatro),
      texto: el.textContent.trim(),
      tamanho: s.fontSize,
      tamanhoDoTitulo: getComputedStyle(h1).fontSize,
      // Assinatura, não botão: nada de fundo, contorno, sombra ou cursor
      sombra: s.textShadow,
      fundo: s.backgroundColor,
      temBorda: parseFloat(s.borderTopWidth) > 0,
      desfoque: s.backdropFilter || s.webkitBackdropFilter,
      cursor: s.cursor,
      peso: s.fontWeight,
      // Acima do título, e as três linhas na mesma margem esquerda
      acimaDoTitulo: r.bottom <= h1.getBoundingClientRect().top + 1,
      recuos: [r.left, h1.getBoundingClientRect().left, sub.getBoundingClientRect().left].map((x) =>
        Math.round(x),
      ),
      vaoAteOTitulo: Math.round(h1.getBoundingClientRect().top - r.bottom),
    }
  })
  console.log(`5a. Produto: "${produto.texto}" ${produto.corDoTexto} ${produto.tamanho} (título ${produto.tamanhoDoTitulo})`)

  // O bloco da esquerda subiu; o cartão da direita não pode ter se mexido —
  // ele continua centrado na janela
  const cartaoCentrado = await p.locator('form').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return Math.round(r.top + r.height / 2 - window.innerHeight / 2)
  })
  console.log(`5a0. Cartão de login — desvio do centro da janela: ${cartaoCentrado}px`)
  if (Math.abs(cartaoCentrado) > 2) {
    erros.push(`O cartão de login saiu do centro: ${cartaoCentrado}px`)
  }
  // Tudo em PIXEL, não em CSS. Dois motivos: o degradê do "4" vem de
  // `color-mix`, que o estilo computado não resolve; e a pastilha agora é
  // translúcida, então o fundo real das letras é a composição dela com o
  // painel — nenhuma cor declarada descreve isso.
  const tinta = await p.evaluate(
    ([cPastilha, cQuatro, corDoRoxo]) => {
      const e = window.__esc
      const lum = (r, g, b) =>
        [r, g, b]
          .map((v) => {
            const x = v / 255
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
          })
          .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)

      const pixels = (c) => {
        const d = window.__ctx.getImageData(c.x * e, c.y * e, c.w * e, c.h * e).data
        const saida = []
        for (let i = 0; i < d.length; i += 4) saida.push([d[i], d[i + 1], d[i + 2]])
        return saida
      }

      // Fundo real da marca: a tira do painel logo acima dela — sem cápsula,
      // o que fica atrás das letras é o próprio roxo
      const dentro = pixels(cPastilha)
      const medio = dentro
        .reduce((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0])
        .map((v) => Math.round(v / dentro.length))
      const lFundo = lum(medio[0], medio[1], medio[2])

      // Laranja do "4": só os pixels da família, média do que foi pintado.
      // O critério é "quente" (vermelho > verde > azul, com folga do azul), e
      // não `r > g*1.6`: essa razão só vale para o laranja puro e descartava
      // quase todo glifo quando o tom é clareado — a medição vinha de 1 pixel.
      const laranjas = pixels(cQuatro).filter(
        ([r, g, b]) => r > g && g > b && r - b > 40,
      )
      const lLaranja = laranjas.length
        ? laranjas.reduce((s, [r, g, b]) => s + lum(r, g, b), 0) / laranjas.length
        : null

      // Sem assumir quem é mais claro: razão entre o maior e o menor
      const contraste = (l) =>
        +((Math.max(l, lFundo) + 0.05) / (Math.min(l, lFundo) + 0.05)).toFixed(2)
      const [r, g, b] = corDoRoxo.match(/\d+/g).map(Number)
      return {
        pixelsLaranja: laranjas.length,
        contrasteDoTexto: contraste(lum(r, g, b)),
        contrasteDoQuatro: lLaranja === null ? null : contraste(lLaranja),
        fundoMedio: `rgb(${medio.join(', ')})`,
        // Roxo = vermelho e azul acima do verde, e nenhum canal saturado
        fundoPuxaRoxo: medio[0] > medio[1] + 12 && medio[2] > medio[1] + 12,
        lumDoFundo: +lFundo.toFixed(3),
      }
    },
    [produto.caixaDoFundo, produto.caixaDoQuatro, produto.corDoTexto],
  )
  console.log(`5a2. Assinatura: fundo ${produto.fundo} | borda ${produto.temBorda} | desfoque ${produto.desfoque} | sombra ${produto.sombra} | cursor ${produto.cursor} | peso ${produto.peso}`)
  console.log(`5a2b. Medido em pixel — painel atrás ${tinta.fundoMedio} (puxa roxo: ${tinta.fundoPuxaRoxo}) | texto ${tinta.contrasteDoTexto}:1 | "4" ${tinta.contrasteDoQuatro}:1 (${tinta.pixelsLaranja} pixels)`)
  console.log(`5a2c. Recuos [marca, título, subtítulo]: ${JSON.stringify(produto.recuos)} | vão até o título: ${produto.vaoAteOTitulo}px`)
  if (produto.texto.toLowerCase() !== 'cloud4mobile') {
    erros.push(`A marca deveria ser "cloud4mobile", é "${produto.texto}"`)
  }
  // Assinatura discreta: 18–22px, semibold/bold, acima do título
  const tamanho = parseFloat(produto.tamanho)
  if (tamanho < 18 || tamanho > 22) erros.push(`Tamanho da assinatura fora de 18–22px: ${produto.tamanho}`)
  if (parseInt(produto.peso, 10) < 600) erros.push(`A assinatura perdeu o peso: ${produto.peso}`)
  if (!produto.acimaDoTitulo) erros.push('A marca deveria ficar acima do título')
  // As três linhas na mesma margem esquerda
  if (new Set(produto.recuos).size !== 1) {
    erros.push(`Marca, título e subtítulo desalinhados à esquerda: ${JSON.stringify(produto.recuos)}`)
  }
  if (produto.vaoAteOTitulo < 14 || produto.vaoAteOTitulo > 30) {
    erros.push(`Vão entre a marca e o título fora de 20–24px: ${produto.vaoAteOTitulo}px`)
  }
  // Nada que sugira botão: sem cápsula, contorno, desfoque, sombra ou cursor
  if (produto.fundo !== 'rgba(0, 0, 0, 0)') erros.push(`A cápsula voltou: ${produto.fundo}`)
  if (produto.temBorda) erros.push('O contorno em volta da marca voltou')
  if (/blur/.test(produto.desfoque)) erros.push('O vidro desfocado voltou')
  if (produto.sombra !== 'none') erros.push(`A sombra do nome voltou: ${produto.sombra}`)
  if (produto.cursor === 'pointer') erros.push('A marca está com cara de clicável')
  // Cores: branco no nome, laranja da marca só no "4"
  if (produto.corDoTexto !== 'rgb(255, 255, 255)') {
    erros.push(`"cloud" e "mobile" deveriam ser brancos: ${produto.corDoTexto}`)
  }
  if (produto.corDoQuatro !== 'rgb(243, 120, 4)') {
    erros.push(`O "4" deveria estar no laranja da marca: ${produto.corDoQuatro}`)
  }
  if (!tinta.pixelsLaranja) erros.push('Nenhum pixel laranja no "4"')
  if (!tinta.fundoPuxaRoxo) erros.push(`O painel atrás da marca não é roxo: ${tinta.fundoMedio}`)
  if (tinta.contrasteDoTexto < 4.5) {
    erros.push(`O nome está apagado sobre o painel: ${tinta.contrasteDoTexto}:1`)
  }
  // 3:1 é o mínimo para texto grande em negrito, que é o caso do "4"
  if (tinta.contrasteDoQuatro !== null && tinta.contrasteDoQuatro < 3) {
    erros.push(`O "4" está apagado sobre o painel: ${tinta.contrasteDoQuatro}:1`)
  }

  // Título e subtítulo
  // A partir do h1, não do produto: a marca virou irmã do painel, e um
  // `querySelector('p')` a partir dali acabava encontrando ela mesma
  const chamada = await p.locator('h1').evaluate((h1) => ({
    titulo: h1.textContent.trim(),
    // O irmão seguinte do h1 agora é a marca — o subtítulo é o outro `p`.
    // `innerText`, não `textContent`: o <br> não vira espaço no textContent e
    // as palavras vizinhas saem coladas ("comparativae")
    subtitulo: h1.parentElement
      .querySelector('p:not([data-produto])')
      .innerText.replace(/\s+/g, ' ')
      .trim(),
  }))
  console.log(`5a3. "${chamada.titulo}" / "${chamada.subtitulo}"`)
  if (chamada.titulo !== 'Painel de Homologação') {
    erros.push(`Título do painel roxo: "${chamada.titulo}"`)
  }
  if (!/Resultados de testes, matriz comparativa e certificado técnico em um só lugar\./.test(chamada.subtitulo)) {
    erros.push(`Subtítulo do painel roxo: "${chamada.subtitulo}"`)
  }

  // --- 5b. Título e subtítulo fora; "ou" e Microsoft dentro ---
  const cartao = await p.locator('form').evaluate((el) => {
    const botoes = [...el.querySelectorAll('button')].map((b) => b.textContent.trim())
    const ms = botoes.findIndex((t) => /Microsoft/.test(t))
    const entrar = botoes.findIndex((t) => /^Entrar$/.test(t))
    return {
      texto: el.textContent.replace(/\s+/g, ' ').trim(),
      botoes,
      // A Microsoft entra DEPOIS do Entrar, com o "ou" no meio
      microsoftDepoisDoEntrar: ms > entrar && entrar >= 0,
      // Por elemento, não por regex no texto: `textContent` concatena sem
      // espaço ("Entrar" + "ou") e a fronteira de palavra não existe
      temSeparadorOu: [...el.querySelectorAll('span')].some((s) => s.textContent.trim() === 'ou'),
      quadradosDaMarca: el.querySelectorAll('svg rect').length,
    }
  })
  console.log(`5b. Cartão: ${JSON.stringify(cartao.botoes)} | "ou": ${cartao.temSeparadorOu} | quadrados MS: ${cartao.quadradosDaMarca}`)
  if (/Acesso restrito/.test(cartao.texto)) erros.push('O subtítulo "Acesso restrito" ainda está lá')
  if (/Entrar\s*Entrar/.test(cartao.texto) || cartao.botoes.filter((t) => t === 'Entrar').length > 1) {
    erros.push('O título "Entrar" duplicado com o botão ainda está lá')
  }
  if (!cartao.temSeparadorOu) erros.push('Falta o separador "ou"')
  if (!cartao.microsoftDepoisDoEntrar) erros.push('O botão da Microsoft deveria vir abaixo do Entrar')
  if (cartao.quadradosDaMarca !== 4) {
    erros.push(`A marca da Microsoft deveria ter 4 quadrados, tem ${cartao.quadradosDaMarca}`)
  }

  // O botão não pode abrir um fluxo que não existe: tem de dizer o que falta
  await p.locator('button:has-text("Microsoft")').click()
  await p.waitForTimeout(300)
  const aviso = await p.locator('[role=alert]').textContent().catch(() => null)
  console.log(`5c. Clique na Microsoft: "${aviso}"`)
  if (!aviso || !/não está configurado/i.test(aviso)) {
    erros.push(`O botão da Microsoft não avisa que o login não existe: "${aviso}"`)
  }
  if (p.url().includes('login') === false) erros.push('O botão da Microsoft navegou para algum lugar')

  // --- 6. Botão Entrar: gradiente, mas só dentro do roxo ---
  const botao = await p.locator('button[type=submit]').evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  )
  console.log(`6. Botão Entrar: ${botao}`)
  if (!botao.startsWith('linear-gradient')) erros.push(`O botão Entrar perdeu o gradiente: ${botao}`)
  if (botao.includes('rgb(243, 120, 4)')) {
    erros.push('O botão Entrar voltou a ter parada laranja — era ela que o cortava em faixas')
  }
  const roxos = ['rgb(110, 34, 107)', 'rgb(126, 32, 101)', 'rgb(74, 18, 64)'].filter((c) =>
    botao.includes(c),
  )
  if (roxos.length < 2) erros.push(`O gradiente do botão saiu do roxo: ${botao}`)

  // --- 6b. Barra do topo: laranja sobre o painel roxo, roxo sobre o branco ---
  //
  // O que importa não é a declaração e sim o que sobra em cima de cada metade
  // da tela — a barra tem 4px e cai exatamente sobre a divisão.
  const barra = await p.evaluate(() => {
    const el = document.querySelector('[data-barra-topo]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const painel = document.querySelector('[data-textura]').parentElement.getBoundingClientRect()
    return {
      topo: Math.round(r.top),
      altura: Math.round(r.height),
      largura: Math.round(r.width),
      degrade: getComputedStyle(el).backgroundImage,
      divisao: Math.round(painel.right),
    }
  })
  console.log(`6b. Barra do topo: ${JSON.stringify(barra)}`)
  if (!barra) erros.push('Falta a barra de marca no topo da tela de login')
  else {
    if (barra.topo !== 0) erros.push(`A barra do topo não encosta no topo: y=${barra.topo}`)
    if (barra.largura < LARGURA - 2) {
      erros.push(`A barra do topo não atravessa a tela: ${barra.largura}px de ${LARGURA}`)
    }
    if (!barra.degrade.startsWith('linear-gradient')) {
      erros.push(`A barra do topo não é degradê: ${barra.degrade}`)
    }
  }

  // Pixel: laranja de um lado da divisão, roxo do outro
  const png6b = await p.screenshot()
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
    png6b.toString('base64'),
  )
  const tons = await p.evaluate((b) => {
    const e = window.__esc
    const ler = (x) => {
      const d = window.__ctx.getImageData(Math.round(x) * e, Math.round(b.altura / 2) * e, 1, 1).data
      return [d[0], d[1], d[2]]
    }
    // Meio de cada metade, longe da transição
    return { sobreORoxo: ler(b.divisao / 2), sobreOBranco: ler(b.divisao + (innerWidth - b.divisao) / 2) }
  }, barra)
  console.log(`6c. Tons da barra: ${JSON.stringify(tons)}`)
  // Quente do lado do painel roxo — a transição é longa, então no meio do
  // painel já não é o laranja puro; o que não pode é ter virado roxo ali
  const [lr, lg, lb] = tons.sobreORoxo
  if (!(lr > 180 && lr > lg && lg > lb)) {
    erros.push(`Sobre o painel roxo a barra deveria puxar laranja: rgb(${tons.sobreORoxo})`)
  }
  const [rr, rg, rb] = tons.sobreOBranco
  if (!(rr > rg && rb > rg)) {
    erros.push(`Sobre o lado branco a barra deveria ser roxa: rgb(${tons.sobreOBranco})`)
  }

  // E o espelho da de baixo: as mesmas três cores, em ordem invertida
  const coresDo = (degrade) => degrade.match(/rgb\([^)]+\)/g) ?? []
  const espelho = await p.evaluate(() => ({
    topo: getComputedStyle(document.querySelector('[data-barra-topo]')).backgroundImage,
    base: getComputedStyle(document.querySelector('[data-barra-base]')).backgroundImage,
  }))
  const cimaCores = coresDo(espelho.topo)
  const baixoCores = coresDo(espelho.base)
  console.log(`6c2. Topo: ${cimaCores.join(', ')} | Base: ${baixoCores.join(', ')}`)
  if (JSON.stringify(cimaCores) !== JSON.stringify([...baixoCores].reverse())) {
    erros.push(
      `A barra do topo não é a de baixo espelhada: ${cimaCores.join(', ')} vs ${baixoCores.join(', ')}`,
    )
  }

  // --- 6d. "Exibir senha" abaixo do campo, e o campo obedece ---
  const antes = await p.locator('#senha').getAttribute('type')
  const marcador = p.locator('[data-exibir-senha]')
  const posicao = await p.evaluate(() => {
    const campo = document.querySelector('#senha').getBoundingClientRect()
    const flag = document.querySelector('[data-exibir-senha]').getBoundingClientRect()
    return { abaixo: flag.top >= campo.bottom, dentroDoCartao: !!document.querySelector('form [data-exibir-senha]') }
  })
  await marcador.check()
  const marcado = await p.locator('#senha').getAttribute('type')
  await marcador.uncheck()
  const desmarcado = await p.locator('#senha').getAttribute('type')
  console.log(
    `6d. Exibir senha: ${antes} → ${marcado} → ${desmarcado} | abaixo do campo: ${posicao.abaixo}`,
  )
  if (antes !== 'password' || desmarcado !== 'password') {
    erros.push(`A senha deveria nascer e voltar oculta: ${antes} / ${desmarcado}`)
  }
  if (marcado !== 'text') erros.push(`Marcar "Exibir senha" não revelou o campo: ${marcado}`)
  if (!posicao.abaixo) erros.push('"Exibir senha" não está abaixo do campo de senha')
  if (!posicao.dentroDoCartao) erros.push('"Exibir senha" saiu do cartão de login')

  // --- 7. O login continua funcionando ---
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/', { timeout: 8000 })
  console.log('7. Login entrou normalmente')
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-login.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
