/**
 * Marca nova (símbolo + lockup), painel de homologação e o popup de
 * informações. Só leitura — não grava nada.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 }, colorScheme: 'dark' })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))
// Um 404 de imagem passaria despercebido na captura
p.on('response', (r) => {
  if (r.status() >= 400 && /\.(png|svg|jpe?g)$/i.test(r.url())) {
    erros.push(`${r.status()} ao carregar ${new URL(r.url()).pathname}`)
  }
})

/** A imagem carregou de fato? (naturalWidth > 0) */
const imagemOk = (seletor) =>
  p.locator(seletor).first().evaluate((el) => ({
    src: new URL(el.currentSrc || el.src).pathname,
    carregou: el.naturalWidth > 0,
    largura: Math.round(el.getBoundingClientRect().width),
  }))

try {
  // --- Login: uma logo só, no cartão. O painel roxo fica limpo. ---
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  const logoLogin = await imagemOk('img[alt="Mobiltec"]')
  const nLogosLogin = await p.locator('img[alt="Mobiltec"]').count()
  console.log(`1. Login: ${JSON.stringify(logoLogin)} | logos na tela: ${nLogosLogin}`)
  if (!logoLogin.carregou) erros.push('A logo do login não carregou')
  if (logoLogin.src !== '/logo-mobiltec.svg') {
    erros.push(`Login deveria usar o lockup SVG, usou ${logoLogin.src}`)
  }
  if (nLogosLogin !== 1) erros.push(`Esperava 1 logo no login, achei ${nLogosLogin}`)

  const favicon = await p.locator('link[rel=icon]').getAttribute('href')
  const respostaFavicon = await p.request.get(`http://localhost:8080${favicon}`)
  console.log(`2. Favicon: ${favicon} → HTTP ${respostaFavicon.status()}`)
  if (favicon !== '/marca-mobiltec.svg') erros.push(`Favicon aponta para ${favicon}`)
  if (respostaFavicon.status() !== 200) erros.push('O arquivo do favicon não existe')

  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.waitForTimeout(1200)

  // --- Menu: nome do item e lockup/símbolo ---
  const itens = await p.locator('aside nav a').allTextContents()
  console.log(`3. Menu: ${JSON.stringify(itens.map((t) => t.trim()))}`)
  if (!itens.some((t) => t.trim() === 'Painel de Homologação')) {
    erros.push('O primeiro item do menu deveria ser "Painel de Homologação"')
  }

  const logoMenu = await imagemOk('aside img[alt="Mobiltec"]')
  if (logoMenu.src !== '/logo-mobiltec.svg') erros.push(`Menu aberto usou ${logoMenu.src}`)

  // A logo tem de estar centralizada na barra, sem botão dividindo o espaço
  const centralizada = await p.evaluate(() => {
    const img = document.querySelector('aside img[alt="Mobiltec"]').getBoundingClientRect()
    const barra = document.querySelector('aside').getBoundingClientRect()
    const centroImg = img.left + img.width / 2
    const centroBarra = barra.left + barra.width / 2
    return {
      desvio: Math.round(Math.abs(centroImg - centroBarra)),
      altura: Math.round(img.height),
      botoesNoCabecalho: document.querySelectorAll('aside > div:first-child button').length,
    }
  })
  console.log(`4a. Logo: ${centralizada.altura}px, desvio do centro ${centralizada.desvio}px, ${centralizada.botoesNoCabecalho} botão(ões) no cabeçalho`)
  if (centralizada.desvio > 2) erros.push(`Logo fora do centro por ${centralizada.desvio}px`)
  if (centralizada.altura < 40) erros.push(`Logo pequena demais: ${centralizada.altura}px`)
  if (centralizada.botoesNoCabecalho > 0) erros.push('Ainda há botão dentro do cabeçalho do menu')

  // O painel inteiro é um card solto: arredondado, com faixa de fundo em
  // volta e na cor do menu por trás.
  const painel = await p.evaluate(() => {
    const card = document.querySelector('[data-painel]')
    const barra = document.querySelector('aside')
    const b = document.querySelector('button[aria-label="Recolher menu"]')
    const r = card.getBoundingClientRect()
    const rBarra = barra.getBoundingClientRect()
    const e = getComputedStyle(card)
    const rb = b.getBoundingClientRect()
    const noCentro = document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2)
    return {
      raio: Math.round(parseFloat(e.borderTopLeftRadius)),
      temBorda: parseFloat(e.borderTopWidth) > 0,
      fundoDoCard: e.backgroundColor,
      folgaTopo: Math.round(r.top),
      folgaDireita: Math.round(window.innerWidth - r.right),
      folgaDoMenu: Math.round(r.left - rBarra.right),
      // A faixa que sobra atrás tem de ser a cor do menu, não branca
      fundoAtras: getComputedStyle(barra.parentElement).backgroundColor,
      fundoDoMenu: getComputedStyle(barra).backgroundColor,
      botaoDentroDoCard: card.contains(b),
      botaoClicavel: b.contains(noCentro) || b === noCentro,
    }
  })
  console.log(`4b. Card do painel: ${JSON.stringify(painel)}`)
  if (!painel.temBorda) erros.push('O painel não tem borda de card')
  if (painel.raio < 8) erros.push(`Painel sem canto arredondado: ${painel.raio}px`)
  if (painel.folgaTopo < 4) erros.push(`O painel encosta no topo da janela (${painel.folgaTopo}px)`)
  if (painel.folgaDireita < 4) erros.push(`O painel encosta na direita (${painel.folgaDireita}px)`)
  if (painel.folgaDoMenu < 4) erros.push(`O painel encosta no menu (${painel.folgaDoMenu}px)`)
  if (painel.fundoAtras !== painel.fundoDoMenu) {
    erros.push(`A faixa de fundo (${painel.fundoAtras}) não é a cor do menu (${painel.fundoDoMenu})`)
  }
  if (painel.fundoAtras === painel.fundoDoCard) {
    erros.push('A faixa de fundo tem a mesma cor do card — o painel não se destaca')
  }
  if (!painel.botaoDentroDoCard) erros.push('O botão de alternar não está na barra do card')
  if (!painel.botaoClicavel) erros.push('Algo está por cima do botão de alternar')

  await p.click('button[aria-label="Recolher menu"]')
  await p.waitForTimeout(500)
  const simbolo = await imagemOk('aside img[alt="Mobiltec"]')
  console.log(`4c. Menu aberto: ${logoMenu.src} | recolhido: ${simbolo.src}`)
  if (simbolo.src !== '/marca-mobiltec.svg') erros.push(`Menu recolhido usou ${simbolo.src}`)
  if (!simbolo.carregou) erros.push('O símbolo não carregou no menu recolhido')
  await p.screenshot({ path: `${SAIDA}/61-menu-recolhido.png` })
  await p.click('button[aria-label="Expandir menu"]')
  await p.waitForTimeout(400)

  // --- Cabeçalho: trilha, linha de dispositivos e abas ---
  const cabecalho = await p.evaluate(() => ({
    titulo: document.querySelector('h1')?.textContent?.trim(),
    // O nome da seção não pode aparecer duas vezes na tela
    repeticoesDoTitulo: (
      document.querySelector('[data-painel]').textContent.match(/Painel de Homologação/g) ?? []
    ).length,
    temRotuloDispositivos: [...document.querySelectorAll('header span')].some(
      (s) => s.textContent.trim() === 'Dispositivos',
    ),
    // `rounded-full` computa como valor gigante ou `calc(infinity * 1px)`
    // conforme o motor — comparar com a altura é mais estável.
    pilulas: [...document.querySelectorAll('header button')]
      .filter((b) => {
        const r = parseFloat(getComputedStyle(b).borderRadius)
        return Number.isFinite(r) ? r >= b.getBoundingClientRect().height / 2 : true
      })
      .filter((b) => !b.getAttribute('role'))
      .map((b) => b.textContent.trim()),
    abas: [...document.querySelectorAll('[role=tab]')].map((b) => b.textContent.trim()),
  }))
  console.log(`5. Título: "${cabecalho.titulo}"`)
  console.log(`   Rótulo "Dispositivos": ${cabecalho.temRotuloDispositivos}`)
  console.log(`   Pílulas: ${JSON.stringify(cabecalho.pilulas)}`)
  console.log(`   Abas: ${JSON.stringify(cabecalho.abas)}`)
  console.log(`5b. "Painel de Homologação" aparece ${cabecalho.repeticoesDoTitulo}x na tela`)
  if (cabecalho.titulo !== 'Painel de Homologação') {
    erros.push(`A trilha deveria ser "Painel de Homologação", é "${cabecalho.titulo}"`)
  }
  if (cabecalho.repeticoesDoTitulo > 1) {
    erros.push(`O nome da seção aparece ${cabecalho.repeticoesDoTitulo}x — deveria aparecer só na trilha`)
  }

  // O nome do registro é das telas de planilha; no painel não aparece
  const registroNoPainel = await p.locator('[data-registro]').count()
  console.log(`5c. "Registro de Testes Internos" no painel: ${registroNoPainel} (esperado 0)`)
  if (registroNoPainel > 0) erros.push('O nome do registro aparece no painel, onde não se registra nada')
  if (!cabecalho.temRotuloDispositivos) erros.push('Falta o rótulo "Dispositivos" antes das pílulas')
  if (cabecalho.pilulas.length < 4) erros.push('Faltam pílulas de categoria')
  if (!cabecalho.abas.some((t) => t.startsWith('Homologados'))) erros.push('Falta a aba Homologados')
  if (!cabecalho.abas.some((t) => t.startsWith('Em homologação'))) {
    erros.push('Falta a aba "Em homologação"')
  }
  if (!cabecalho.abas.some((t) => t.startsWith('Revalidados'))) erros.push('Falta a aba Revalidados')
  if (cabecalho.abas.some((t) => /Catálogo|Lista de dispositivos/.test(t))) {
    erros.push('As abas antigas ainda estão na tela')
  }

  // A pílula ativa fica roxa
  const corAtiva = await p
    .locator('header button:has-text("Todos")')
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  console.log(`6. Pílula ativa: ${corAtiva}`)
  if (corAtiva !== 'rgb(126, 32, 101)') erros.push(`Pílula ativa não está roxa: ${corAtiva}`)

  // A busca fica ao lado das abas, na mesma linha, e fora do grupo
  const busca = await p.evaluate(() => {
    const input = document.querySelector('input[placeholder^="Buscar"]')
    const grupo = document.querySelector('[role=tablist]')
    const ri = input.getBoundingClientRect()
    const rg = grupo.getBoundingClientRect()
    return {
      dentroDoGrupo: grupo.contains(input),
      mesmaLinha: Math.abs(ri.top + ri.height / 2 - (rg.top + rg.height / 2)) < 6,
      aDireita: ri.left >= rg.right,
    }
  })
  console.log(`6b. Busca: mesma linha das abas=${busca.mesmaLinha}, à direita=${busca.aDireita}, dentro do grupo=${busca.dentroDoGrupo}`)
  if (busca.dentroDoGrupo) erros.push('A busca ficou dentro do grupo de abas')
  if (!busca.mesmaLinha) erros.push('A busca não está na mesma linha das abas')
  if (!busca.aDireita) erros.push('A busca não está ao lado das abas')

  // O campo não deve sobrar muito além do próprio placeholder
  const folgaDaBusca = await p.evaluate(() => {
    const input = document.querySelector('input[placeholder^="Buscar"]')
    const e = getComputedStyle(input)
    const medida = document.createElement('span')
    medida.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${e.font}`
    medida.textContent = input.placeholder
    document.body.append(medida)
    const texto = medida.getBoundingClientRect().width
    medida.remove()
    return Math.round(
      input.getBoundingClientRect().width - parseFloat(e.paddingLeft) - parseFloat(e.paddingRight) - texto,
    )
  })
  console.log(`6c. Sobra do campo de busca depois do placeholder: ${folgaDaBusca}px`)
  if (folgaDaBusca > 40) erros.push(`Campo de busca largo demais: ${folgaDaBusca}px de sobra`)
  if (folgaDaBusca < 0) erros.push(`O placeholder não cabe no campo: falta ${-folgaDaBusca}px`)
  await p.screenshot({ path: `${SAIDA}/57-painel-homologados.png` })

  // --- Homologados: selo verde e a foto sobre a divisória ---
  const cards = await p.locator('[data-modelo]').count()
  const nomes = await p
    .locator('[data-modelo]')
    .evaluateAll((els) => els.map((e) => e.dataset.modelo))
  console.log(`7. Homologados: ${cards} card(s) — ${JSON.stringify(nomes)}`)
  if (cards < 1) erros.push('Nenhum card no catálogo de homologados')

  // A anatomia é conferida no L400: é o modelo que serviu de referência em
  // todos os ajustes do card. Quantos outros estejam finalizados não importa
  // — o roteiro não pode depender do que já foi homologado até hoje.
  const alvo = p
    .locator(nomes.some((n) => /L400/i.test(n)) ? '[data-modelo*="L400"]' : '[data-modelo]')
    .first()

  const selo = await alvo.evaluate((el) => {
    const textos = [...el.querySelectorAll('span')].map((s) => s.textContent.trim())
    const badge = [...el.querySelectorAll('span')].find((s) =>
      /^(Homologado|Não homologado)$/.test(s.textContent.trim()),
    )
    return {
      textos,
      rotulo: badge?.textContent.trim() ?? null,
      cor: badge ? getComputedStyle(badge).color : null,
      temExemplo: el.textContent.includes('Exemplo'),
      temEmAndamento: el.textContent.includes('em andamento'),
    }
  })
  console.log(`7b. Selo: "${selo.rotulo}" ${selo.cor} | flag Exemplo: ${selo.temExemplo} | "em andamento": ${selo.temEmAndamento}`)
  if (selo.rotulo !== 'Homologado') erros.push(`O selo deveria dizer "Homologado", diz "${selo.rotulo}"`)
  if (selo.cor !== 'rgb(21, 128, 61)') erros.push(`O selo não está verde: ${selo.cor}`)
  if (selo.temExemplo) erros.push('A flag "Exemplo" ainda está no card')
  if (selo.temEmAndamento) erros.push('A flag "Homologação em andamento" ainda está no card')

  // Foto centralizada cavalgando a divisória; nome e selo acima do topo dela
  const anatomia = await alvo.evaluate((card) => {
    const titulo = card.querySelector('h3')
    const foto = card.querySelector('img').parentElement
    const selo = [...card.querySelectorAll('span')].find((s) =>
      /^(Homologado|Não homologado)$/.test(s.textContent.trim()),
    )
    const divisoria = card.querySelector('.border-t')
    const r = (el) => el.getBoundingClientRect()
    const rc = r(card)
    const rf = r(foto)
    return {
      // A foto continua no meio do card e atravessando a linha
      fotoCentralizada: Math.abs(rf.left + rf.width / 2 - (rc.left + rc.width / 2)) < 2,
      fotoCruzaDivisoria: (() => {
        const y = r(divisoria).top
        return rf.top < y && rf.bottom > y
      })(),
      alturaDaFoto: Math.round(rf.height),
      // O título termina ACIMA do topo da foto. É o que permite a ele usar a
      // largura toda até o selo: nomes longos ("P2_LITE_SE-B") passavam por
      // baixo da foto quando ficavam na mesma altura dela.
      tituloAcimaDaFoto: r(titulo).bottom <= rf.top + 1,
      folgaAteAFoto: Math.round(rf.top - r(titulo).bottom),
      seloDepoisDaFoto: r(selo).left >= rf.right - 1,
      // Nem o nome nem o veredito podem ser cortados — "Homolog…" não diz nada
      tituloTruncado: titulo.scrollWidth > titulo.clientWidth + 1,
      seloTruncado: selo.scrollWidth > selo.clientWidth + 1,
      seloVisivel: selo.textContent.trim(),
      // O selo acompanha a primeira linha do título, não a do modelo
      seloNaLinhaDoFabricante: (() => {
        const fab = card.querySelector('p')
        return Math.abs(r(selo).top + r(selo).height / 2 - (r(fab).top + r(fab).height / 2)) < 6
      })(),
      // Sobra abaixo do botão: é o vão que o usuário pediu para tirar
      alturaDoCard: Math.round(rc.height),
      sobraAbaixoDoBotao: Math.round(rc.bottom - r(card.querySelector('a[href*="/dispositivos/"]')).bottom),
    }
  })
  console.log(`7c. Faixa do card: ${JSON.stringify(anatomia)}`)
  if (!anatomia.fotoCentralizada) erros.push('A foto saiu do centro do card')
  if (!anatomia.fotoCruzaDivisoria) erros.push('A foto não está mais cavalgando a divisória')
  if (anatomia.alturaDaFoto !== 96) erros.push(`A foto mudou de tamanho: ${anatomia.alturaDaFoto}px`)
  if (!anatomia.tituloAcimaDaFoto) {
    erros.push(`O nome voltou a ficar na altura da foto (folga ${anatomia.folgaAteAFoto}px)`)
  }
  if (!anatomia.seloDepoisDaFoto) erros.push('O selo invade a foto')
  if (anatomia.tituloTruncado) erros.push('O nome do modelo está sendo cortado')
  if (anatomia.seloTruncado) erros.push(`O selo está sendo cortado: "${anatomia.seloVisivel}"`)
  if (anatomia.sobraAbaixoDoBotao > 14) {
    erros.push(`Sobra ${anatomia.sobraAbaixoDoBotao}px de vão abaixo do botão`)
  }
  if (!anatomia.seloNaLinhaDoFabricante) {
    erros.push('O selo não está na altura da primeira linha do título')
  }

  // Nenhum texto pode se sobrepor à foto — com flex isso é estrutural,
  // mas a checagem fica: é o limite que derrubou o desenho anterior.
  const colisoes = await p.locator('[data-modelo]').first().evaluate((card) => {
    const foto = card.querySelector('img').parentElement.getBoundingClientRect()
    const cruza = (r) =>
      r.right > foto.left && r.left < foto.right && r.bottom > foto.top && r.top < foto.bottom
    const medir = (el) => {
      const faixa = document.createRange()
      faixa.selectNodeContents(el)
      return faixa.getBoundingClientRect()
    }
    return [...card.querySelectorAll('dt, dd, h3, p, span')]
      .filter((el) => el.textContent.trim() && cruza(medir(el)))
      .map((el) => el.textContent.trim())
  })
  console.log(`7c2. Textos encostando na foto: ${JSON.stringify(colisoes)}`)
  if (colisoes.length) erros.push(`Texto sobre a foto do card: ${colisoes.join(', ')}`)

  // 7c4/7c5 valem para TODOS os cards do catálogo, não só o primeiro: os dois
  // defeitos ("P2_LITE_SE-B" sumindo atrás da foto, foto pequena demais)
  // dependem do nome e do arquivo de cada modelo.
  const porCard = await p.evaluate(() => {
    // Onde o desenho aparece de fato, já com o `transform` do recorte
    const desenho = (img) => {
      const caixa = img.parentElement.getBoundingClientRect()
      const L = 96
      const c = document.createElement('canvas')
      c.width = L
      c.height = L
      const ctx = c.getContext('2d', { willReadFrequently: true })
      const cs = getComputedStyle(img)
      const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform)
      const util = {
        w: img.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        h: img.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
      }
      const e = Math.min(util.w / img.naturalWidth, util.h / img.naturalHeight)
      const w = img.naturalWidth * e
      const h = img.naturalHeight * e
      ctx.setTransform(1, 0, 0, 1, caixa.width / 2, caixa.height / 2)
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f)
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
      const d = ctx.getImageData(0, 0, L, L).data
      let x0 = L
      let y0 = L
      let x1 = -1
      let y1 = -1
      for (let y = 0; y < L; y++) {
        for (let x = 0; x < L; x++) {
          const i = (y * L + x) * 4
          if (d[i + 3] <= 24 || (d[i] > 244 && d[i + 1] > 244 && d[i + 2] > 244)) continue
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
      return x1 < 0
        ? null
        : { larg: Math.round(((x1 - x0 + 1) / L) * 100), alt: Math.round(((y1 - y0 + 1) / L) * 100) }
    }

    return [...document.querySelectorAll('article[data-modelo]')].map((card) => {
      const img = card.querySelector('img')
      const h3 = card.querySelector('h3')
      const foto = img ? img.parentElement.getBoundingClientRect() : null
      const t = h3.getBoundingClientRect()
      const oc = img ? desenho(img) : null
      return {
        modelo: card.dataset.modelo,
        titulo: h3.textContent,
        cortado: h3.scrollWidth > h3.clientWidth,
        // > 0 significa que o texto passa por baixo da foto
        invadeFoto: foto ? Math.round(Math.min(t.right, foto.right) - Math.max(t.left, foto.left)) : -1,
        folgaAteAFoto: foto ? Math.round(foto.top - t.bottom) : null,
        ocupa: oc ? `${oc.larg}% x ${oc.alt}%` : '—',
        maiorLado: oc ? Math.max(oc.larg, oc.alt) : 0,
      }
    })
  })
  console.table(porCard)

  for (const c of porCard) {
    if (c.invadeFoto > 0 && c.folgaAteAFoto < 0) {
      erros.push(`"${c.titulo}" passa por baixo da foto (${c.invadeFoto}px de sobreposição)`)
    }
    if (c.cortado) erros.push(`O nome "${c.titulo}" está truncado no card`)
    // A foto tem de encher a caixa na dimensão que manda. Sem isso, quem
    // decide o tamanho na tela é a margem branca embutida no arquivo, e
    // modelos vizinhos aparecem em escalas diferentes.
    if (c.maiorLado < 78) {
      erros.push(`A foto de "${c.modelo}" não aproveita a caixa: ${c.ocupa}`)
    }
  }

  // Hover de verdade (não evento sintético): só a sombra cresce
  const cartao = p.locator('[data-modelo]').first()
  const antesDoHover = await cartao.evaluate((el) => ({
    sombra: getComputedStyle(el).boxShadow,
    borda: getComputedStyle(el).borderTopColor,
  }))
  await cartao.hover()
  await p.waitForTimeout(400)
  const noHover = await cartao.evaluate((el) => ({
    sombra: getComputedStyle(el).boxShadow,
    borda: getComputedStyle(el).borderTopColor,
    transicao: getComputedStyle(el).transitionProperty,
  }))
  console.log(`7c3. Hover — borda: ${antesDoHover.borda} → ${noHover.borda} | transição: ${noHover.transicao}`)
  if (noHover.sombra === antesDoHover.sombra) erros.push('A sombra do card não muda no hover')
  if (noHover.borda !== antesDoHover.borda) {
    erros.push(`A borda mudou no hover (${noHover.borda}) — era para ficar só a sombra`)
  }
  if (!noHover.transicao.includes('box-shadow')) {
    erros.push('A sombra muda sem transição — fica seco em vez de sutil')
  }
  await p.mouse.move(0, 0)

  // O fabricante não pode se repetir no título do card
  const titulos = await p.locator('[data-modelo]').first().evaluate((el) => ({
    fabricante: el.querySelector('p').textContent.trim(),
    modelo: el.querySelector('h3').textContent.trim(),
  }))
  const repetido = titulos.modelo.toLowerCase().includes(titulos.fabricante.toLowerCase())
  console.log(`7d. Card: "${titulos.fabricante}" / "${titulos.modelo}" — repete o fabricante: ${repetido}`)
  if (repetido) erros.push(`O card repete o fabricante no título: "${titulos.modelo}"`)

  // Os dados do card têm que bater com a API, não com constante no código
  const daApi = await p.evaluate(async () => {
    const t = localStorage.getItem('homolog.token')
    const r = await fetch('/api/vitrine', { headers: { Authorization: `Bearer ${t}` } })
    const { dispositivos } = await r.json()
    const l400 = dispositivos.find((d) => /L400/i.test(d.modelo))
    return l400 ? { agente: l400.versaoAgente, so: l400.versaoSo } : null
  })
  const textoCard = await alvo.textContent()
  console.log(`8. API diz agente ${daApi?.agente} / ${daApi?.so} — card: ${textoCard.includes(daApi.agente)}`)
  if (!daApi) erros.push('A API não devolveu o L400')
  else if (!textoCard.includes(daApi.agente)) {
    erros.push(`O card não mostra a versão atual do agente (${daApi.agente})`)
  }

  // A foto vem de /uploads, servida pelo backend atrás do proxy /api.
  //
  // Não dá para medir o vazamento pelo retângulo do `<img>`: o recorte que
  // faz o aparelho preencher a caixa é um `transform: scale`, e ele aumenta
  // a caixa do elemento mesmo quando nada aparece fora. O que importa é a
  // pastilha recortar de verdade, e ela caber no card.
  const foto = await alvo
    .locator('img')
    .first()
    .evaluate((el) => {
      const pastilha = el.parentElement
      const rp = pastilha.getBoundingClientRect()
      const rcard = el.closest('[data-modelo]').getBoundingClientRect()
      return {
        src: new URL(el.src).pathname,
        carregou: el.naturalWidth > 0,
        pastilhaRecorta: getComputedStyle(pastilha).overflow === 'hidden',
        vazaDoCard: Math.round(
          Math.max(0, rp.right - rcard.right, rcard.left - rp.left, rp.bottom - rcard.bottom),
        ),
      }
    })
    .catch(() => null)
  if (foto) {
    console.log(`8b. Foto: ${foto.src} — carregou: ${foto.carregou}, recorta: ${foto.pastilhaRecorta}, vaza do card ${foto.vazaDoCard}px`)
    if (!foto.carregou) erros.push(`A foto do dispositivo não carregou (${foto.src})`)
    if (!foto.pastilhaRecorta) erros.push('A pastilha da foto deixou de recortar — o zoom vai vazar')
    if (foto.vazaDoCard > 1) erros.push(`A pastilha da foto vaza ${foto.vazaDoCard}px do card`)
  } else {
    console.log('8b. Card sem foto cadastrada')
  }

  // --- "Exibir informações" vai direto para a tela, sem popup ---
  await p.locator('a:has-text("Exibir informações")').first().click()
  await p.waitForTimeout(1000)
  const foiDireto = await p.evaluate(() => ({
    url: location.pathname,
    popup: document.querySelectorAll('[role=dialog]').length,
    itens: document.querySelectorAll('tbody tr').length,
  }))
  console.log(`9. "Exibir informações" → ${foiDireto.url} | popups: ${foiDireto.popup} | ${foiDireto.itens} itens`)
  if (foiDireto.popup > 0) erros.push('O popup de informações voltou')
  if (!foiDireto.url.startsWith('/dispositivos/')) {
    erros.push(`Deveria navegar para a tela de informações, foi para ${foiDireto.url}`)
  }
  if (foiDireto.itens < 40) erros.push(`A tela não trouxe o resultado completo: ${foiDireto.itens} itens`)

  // --- Cabeçalho da ficha: foto, identificação em uma linha, e a ação ---
  const cabecalhoFicha = await p.evaluate(() => {
    const h2 = document.querySelector('h2')
    const baixar = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Certificado técnico'),
    )
    const foto = document.querySelector('img[alt]:not([alt="Mobiltec"])')
    const eh2 = getComputedStyle(h2)
    const r = (el) => el.getBoundingClientRect()
    return {
      titulo: h2.textContent.trim().replace(/\s+/g, ' '),
      // Mesmo desenho do rótulo do fabricante: pequeno, maiúsculas, esmaecido
      estiloDoTitulo: {
        tamanho: eh2.fontSize,
        caixa: eh2.textTransform,
        cor: eh2.color,
      },
      rotuloDoBaixar: baixar?.textContent.trim() ?? null,
      temIconeDeBaixar: !!baixar?.querySelector('svg'),
      temCompartilhar: !!document.querySelector('button[aria-label="Compartilhar certificado"]'),
      // Nome e botão continuam na mesma linha
      nomeEBotaoAlinhados:
        Math.abs(r(h2).top + r(h2).height / 2 - (r(baixar).top + r(baixar).height / 2)) < 4,
      // A foto é uma coluna à esquerda dos dados, e grande
      fotoAEsquerda: r(foto).right <= r(document.querySelector('dl')).left + 1,
      alturaDaFoto: Math.round(r(foto.parentElement).height),
      // Centrada no bloco de dados ao lado, não encostada no topo dele
      desvioVerticalDaFoto: (() => {
        // `foto` é o <img>; a caixa da pastilha está dois níveis acima, e é
        // ela que tem a coluna de dados como irmã
        const caixa = foto.parentElement.parentElement
        const rf = r(caixa)
        const dados = r(caixa.nextElementSibling)
        return Math.round(rf.top + rf.height / 2 - (dados.top + dados.height / 2))
      })(),
      // O cabeçalho (nome + botão) atravessa o card inteiro, acima da foto
      cabecalhoNaLarguraToda: (() => {
        const secao = h2.closest('section')
        const linha = secao.querySelector('.border-b')
        const cs = getComputedStyle(secao)
        // `box-sizing: border-box`: a largura inclui a borda, então ela entra
        // na conta junto com o padding
        const util =
          r(secao).width -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight) -
          parseFloat(cs.borderLeftWidth) -
          parseFloat(cs.borderRightWidth)
        return Math.abs(r(linha).width - util) < 2
      })(),
      // Espaço morto entre a borda de cima e o nome
      folgaAcimaDoTitulo: Math.round(r(h2).top - r(h2.closest('section')).top),
      // Ordem dos campos: as duas datas e, abaixo, as duas assinaturas
      camposFinais: [...document.querySelectorAll('dl dt')].slice(-4).map((el) => el.textContent.trim()),
      // O cabeçalho vive dentro do mesmo card da ficha, não num bloco solto
      dentroDaFicha: !!h2.closest('section')?.textContent.includes('Unidade testada'),
      // Identificador de unidade não entra nesta tela — é a mesma regra do
      // certificado, e esta é a tela que o parceiro vai ver
      identificadores: ['IMEI', 'Número de série', 'Número de Série'].filter((rot) =>
        h2.closest('section')?.textContent.includes(rot),
      ),
    }
  })
  console.log(`10. Cabeçalho: "${cabecalhoFicha.titulo}" ${JSON.stringify(cabecalhoFicha.estiloDoTitulo)}`)
  console.log(`10b. ${cabecalhoFicha.rotuloDoBaixar} | ícone: ${cabecalhoFicha.temIconeDeBaixar} | compartilhar: ${cabecalhoFicha.temCompartilhar} | nome+botão alinhados: ${cabecalhoFicha.nomeEBotaoAlinhados} | dentro da ficha: ${cabecalhoFicha.dentroDaFicha}`)
  console.log(`10c. Foto à esquerda: ${cabecalhoFicha.fotoAEsquerda} (${cabecalhoFicha.alturaDaFoto}px, desvio do centro ${cabecalhoFicha.desvioVerticalDaFoto}px) | cabeçalho full width: ${cabecalhoFicha.cabecalhoNaLarguraToda} | folga acima do título: ${cabecalhoFicha.folgaAcimaDoTitulo}px | identificadores na tela: ${JSON.stringify(cabecalhoFicha.identificadores)}`)
  if (!cabecalhoFicha.cabecalhoNaLarguraToda) {
    erros.push('A divisória do cabeçalho deveria atravessar o card inteiro')
  }
  if (cabecalhoFicha.folgaAcimaDoTitulo > 26) {
    erros.push(`Sobra demais acima do título: ${cabecalhoFicha.folgaAcimaDoTitulo}px`)
  }
  console.log(`10c2. Últimos campos: ${JSON.stringify(cabecalhoFicha.camposFinais)}`)
  if (Math.abs(cabecalhoFicha.desvioVerticalDaFoto) > 6) {
    erros.push(`A foto saiu do centro do card: ${cabecalhoFicha.desvioVerticalDaFoto}px`)
  }
  const esperados = ['Início', 'Conclusão', 'Responsável técnico', 'Gerente de validação']
  if (JSON.stringify(cabecalhoFicha.camposFinais) !== JSON.stringify(esperados)) {
    erros.push(`Ordem dos últimos campos mudou: ${JSON.stringify(cabecalhoFicha.camposFinais)}`)
  }
  if (cabecalhoFicha.rotuloDoBaixar !== 'Certificado técnico') {
    erros.push(`O botão deveria dizer "Certificado técnico", diz "${cabecalhoFicha.rotuloDoBaixar}"`)
  }
  if (!cabecalhoFicha.temIconeDeBaixar) erros.push('Falta o ícone de baixar no botão do certificado')
  if (cabecalhoFicha.temCompartilhar) erros.push('O botão de compartilhar voltou')
  if (!cabecalhoFicha.nomeEBotaoAlinhados) erros.push('Nome e botão saíram da mesma linha')
  if (!cabecalhoFicha.fotoAEsquerda) erros.push('A foto deveria ficar à esquerda dos dados')
  if (cabecalhoFicha.alturaDaFoto < 180) {
    erros.push(`A foto da ficha encolheu: ${cabecalhoFicha.alturaDaFoto}px`)
  }
  if (cabecalhoFicha.identificadores.length) {
    erros.push(`Identificador de unidade na tela: ${cabecalhoFicha.identificadores.join(', ')}`)
  }

  // Nenhum par rótulo/valor pode quebrar ou truncar: é o que decide quantas
  // colunas a ficha aguenta, e passou despercebido quando a grade era de 3
  const apertados = await p.evaluate(() =>
    [...document.querySelector('dl').children]
      .map((div) => {
        const dt = div.querySelector('dt')
        const dd = div.querySelector('dd')
        return {
          campo: dt.textContent.trim(),
          truncou: dd.scrollWidth > dd.clientWidth + 1,
          quebrou: div.getBoundingClientRect().height > 28,
        }
      })
      .filter((c) => c.truncou || c.quebrou),
  )
  console.log(`10d. Campos apertados na ficha: ${JSON.stringify(apertados)}`)
  if (apertados.length) {
    erros.push(`Campos truncando ou quebrando na ficha: ${apertados.map((c) => c.campo).join(', ')}`)
  }

  // --- 10e. Resultado: 3 colunas do certificado, grupos dois a dois ---
  const matrizWeb = await p.evaluate(() => {
    // Régua com a fonte real: é o único jeito de saber se um texto CABE na
    // coluna, em vez de só constatar que a linha ficou alta
    const regua = document.createElement('span')
    regua.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'
    document.body.append(regua)
    const larguraDe = (texto, fonte) => {
      regua.style.font = fonte
      regua.textContent = texto
      return Math.ceil(regua.getBoundingClientRect().width)
    }

    const tabelas = [...document.querySelectorAll('table')]
    const linhas = [...document.querySelectorAll('tbody tr')]

    // O nome do item nunca pode quebrar: é o que identifica a linha
    const nomesQuebrando = []
    for (const tr of linhas) {
      const td = tr.children[0]
      const cs = getComputedStyle(td)
      const util =
        td.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const texto = td.textContent.trim()
      if (larguraDe(texto, cs.font) > util + 1) nomesQuebrando.push(texto)
    }

    // Nenhuma tabela pode estourar o card que a contém
    const estourando = tabelas.filter(
      (t) => t.getBoundingClientRect().width > t.parentElement.getBoundingClientRect().width + 1,
    ).length

    // O `?` tem de existir exatamente onde há justificativa
    const linhasComNota = []
    const dicasSobrando = []
    for (const tr of linhas) {
      const temDica = !!tr.querySelector('[data-dica]')
      if (temDica) linhasComNota.push(tr.children[0].textContent.trim())
    }

    // Cada card com a altura do seu conteúdo: em grid, os dois de uma fileira
    // eram esticados até o maior e o menor sobrava vão branco embaixo
    const cards = tabelas.map((t) => {
      const c = t.parentElement.getBoundingClientRect()
      return {
        altura: Math.round(c.height),
        // Sobra entre o fim da tabela e o fim do card
        vaoAbaixo: Math.round(c.bottom - t.getBoundingClientRect().bottom),
        raio: parseFloat(getComputedStyle(t.parentElement).borderTopLeftRadius),
      }
    })

    // A flag "Não testado" precisa de fundo próprio para ser vista
    const naoTestado = (() => {
      const tr = linhas.find((x) => /Não testado/.test(x.children[2].textContent))
      if (!tr) return null
      const s = getComputedStyle(tr.children[2].querySelector('span span'))
      return { fundo: s.backgroundColor, cor: s.color }
    })()

    const iconeDica = (() => {
      const b = document.querySelector('[data-dica]')
      if (!b) return null
      const s = getComputedStyle(b)
      const r = b.getBoundingClientRect()
      const pastilha = b.parentElement.querySelector('span:last-child')
      return {
        borda: s.borderTopColor,
        cor: s.color,
        lado: Math.round(r.width),
        // O "?" vem ANTES da pastilha de status
        antesDaPastilha: r.right <= pastilha.getBoundingClientRect().left + 1,
      }
    })()

    regua.remove()
    return {
      cards,
      naoTestado,
      iconeDica,
      cabecalhos: tabelas.map((t) =>
        [...t.querySelectorAll('th')].map((th) => th.textContent.trim()).join(' · '),
      ),
      corDoCabecalho: getComputedStyle(tabelas[0].querySelector('th')).color,
      fundoDoCabecalho: getComputedStyle(tabelas[0].querySelector('thead tr')).backgroundColor,
      colunasPorLinha: linhas[0]?.children.length ?? 0,
      // Duas fileiras de dois: quantas posições horizontais distintas os cards ocupam
      colunasDeGrupos: new Set(
        tabelas.map((t) => Math.round(t.getBoundingClientRect().left)),
      ).size,
      acoesPreenchidas: linhas.filter((tr) => tr.children[1].textContent.trim().length > 3).length,
      totalDeItens: linhas.length,
      nomesQuebrando: [...new Set(nomesQuebrando)],
      estourando,
      comDica: linhasComNota.length,
      dicasSobrando,
    }
  })
  console.log(`10e. Cabeçalhos por grupo: ${JSON.stringify(matrizWeb.cabecalhos)}`)
  console.log(`10e2. ${matrizWeb.colunasPorLinha} colunas/linha | grupos lado a lado: ${matrizWeb.colunasDeGrupos} | ações preenchidas: ${matrizWeb.acoesPreenchidas}/${matrizWeb.totalDeItens}`)
  console.log(`10e3. Cabeçalho ${matrizWeb.corDoCabecalho} sobre ${matrizWeb.fundoDoCabecalho} | nomes quebrando: ${JSON.stringify(matrizWeb.nomesQuebrando)} | tabelas estourando: ${matrizWeb.estourando} | linhas com "?": ${matrizWeb.comDica}`)
  if (matrizWeb.colunasPorLinha !== 3) {
    erros.push(`As linhas do resultado deveriam ter 3 colunas, têm ${matrizWeb.colunasPorLinha}`)
  }
  if (matrizWeb.cabecalhos.some((c) => c.includes('Divergências'))) {
    erros.push('A coluna de divergências voltou — a justificativa vive no balão do "?"')
  }
  if (!matrizWeb.cabecalhos.some((c) => c.includes('Ação Realizada'))) {
    erros.push(`Falta o cabeçalho de colunas do certificado: ${JSON.stringify(matrizWeb.cabecalhos)}`)
  }
  // Um grupo abaixo do outro, como no certificado: todos começam no mesmo x
  if (matrizWeb.colunasDeGrupos !== 1) {
    erros.push(`Os grupos deveriam ficar empilhados, achei ${matrizWeb.colunasDeGrupos} coluna(s)`)
  }
  if (matrizWeb.corDoCabecalho !== 'rgb(126, 32, 101)') {
    erros.push(`O cabeçalho das colunas deveria ser roxo: ${matrizWeb.corDoCabecalho}`)
  }
  if (matrizWeb.fundoDoCabecalho !== 'rgb(244, 244, 246)') {
    erros.push(`O fundo do cabeçalho saiu do cinza claro: ${matrizWeb.fundoDoCabecalho}`)
  }
  if (matrizWeb.acoesPreenchidas !== matrizWeb.totalDeItens) {
    erros.push(
      `A coluna do meio ficou vazia em ${matrizWeb.totalDeItens - matrizWeb.acoesPreenchidas} item(ns)`,
    )
  }
  // Em meia largura a ação pode quebrar; o nome do item, não — é o identificador
  if (matrizWeb.nomesQuebrando.length) {
    erros.push(`Nome de item quebrando em duas linhas: ${matrizWeb.nomesQuebrando.slice(0, 3).join(' | ')}`)
  }
  if (matrizWeb.estourando) erros.push(`${matrizWeb.estourando} tabela(s) estourando o card`)
  if (matrizWeb.comDica === 0) erros.push('Nenhuma linha ganhou o "?" da justificativa')

  // --- 10e4. Cards sem esticão, cantos menos redondos, flag legível ---
  console.log(`10e4. Cards: ${JSON.stringify(matrizWeb.cards)}`)
  console.log(`10e5. "Não testado": ${JSON.stringify(matrizWeb.naoTestado)} | ícone "?": ${JSON.stringify(matrizWeb.iconeDica)}`)
  const esticados = matrizWeb.cards.filter((c) => c.vaoAbaixo > 4)
  if (esticados.length) {
    erros.push(`${esticados.length} card(s) esticado(s) além do conteúdo: ${esticados.map((c) => c.vaoAbaixo).join(', ')}px de vão`)
  }
  // Alturas diferentes provam que os cards não estão sendo igualados
  if (new Set(matrizWeb.cards.map((c) => c.altura)).size < matrizWeb.cards.length) {
    erros.push('Dois cards com a mesma altura exata — voltaram a ser esticados?')
  }
  if (matrizWeb.cards.some((c) => c.raio > 10)) {
    erros.push(`Cantos ainda muito arredondados: ${matrizWeb.cards.map((c) => c.raio).join(', ')}px`)
  }
  if (!matrizWeb.naoTestado) {
    erros.push('Nenhum item "Não testado" na tela — o roteiro não checou a flag cinza')
  } else if (matrizWeb.naoTestado.fundo === 'rgba(0, 0, 0, 0)' || matrizWeb.naoTestado.fundo === 'rgb(255, 255, 255)') {
    erros.push(`A flag "Não testado" voltou a ficar sem fundo: ${matrizWeb.naoTestado.fundo}`)
  }
  // O "?" tem de ser roxo de saída, não só no hover
  if (matrizWeb.iconeDica?.borda !== 'rgb(126, 32, 101)' || matrizWeb.iconeDica?.cor !== 'rgb(126, 32, 101)') {
    erros.push(`O "?" não está roxo em repouso: ${JSON.stringify(matrizWeb.iconeDica)}`)
  }
  if (!matrizWeb.iconeDica?.antesDaPastilha) {
    erros.push('O "?" deveria ficar à esquerda da pastilha de status')
  }
  if (matrizWeb.iconeDica && matrizWeb.iconeDica.lado > 15) {
    erros.push(`A bolinha do "?" cresceu de novo: ${matrizWeb.iconeDica.lado}px`)
  }

  // --- 10f. O balão abre no hover, com o texto certo e dentro da janela ---
  const dica = p.locator('[data-dica]').first()
  const linhaDaDica = await dica.evaluate((el) => el.closest('tr').children[0].textContent.trim())
  await dica.scrollIntoViewIfNeeded()
  const semHover = await p.locator('[data-balao]').count()
  await dica.hover()
  await p.waitForTimeout(350)
  const balao = await p.evaluate(() => {
    const b = document.querySelector('[data-balao]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    const s = getComputedStyle(b)
    const gatilho = document.querySelector('[data-dica]').getBoundingClientRect()
    return {
      chars: b.textContent.trim().length,
      fundo: s.backgroundColor,
      cor: s.color,
      dentroDaJanela:
        r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      // Cresce para a esquerda: é para onde há espaço numa linha de tabela
      abreParaEsquerda: r.left < gatilho.left,
    }
  })
  await p.mouse.move(0, 0)
  await p.waitForTimeout(250)
  const depoisDoHover = await p.locator('[data-balao]').count()
  console.log(`10f. "${linhaDaDica}" — balões antes: ${semHover} | no hover: ${JSON.stringify(balao)} | depois: ${depoisDoHover}`)
  if (semHover !== 0) erros.push('O balão da justificativa aparece sem hover')
  if (!balao) erros.push('O balão não abriu ao passar o mouse no "?"')
  else {
    if (balao.chars < 20) erros.push(`O balão abriu quase vazio: ${balao.chars} caracteres`)
    if (balao.fundo !== 'rgb(110, 34, 107)') erros.push(`O balão saiu do roxo: ${balao.fundo}`)
    if (balao.cor !== 'rgb(255, 255, 255)') erros.push(`O texto do balão não está branco: ${balao.cor}`)
    if (!balao.dentroDaJanela) erros.push('O balão nasceu fora da janela')
    if (!balao.abreParaEsquerda) erros.push('O balão deveria crescer para a esquerda do "?"')
  }
  if (depoisDoHover !== 0) erros.push('O balão não fecha quando o mouse sai')
  if (cabecalhoFicha.estiloDoTitulo.caixa !== 'uppercase') {
    erros.push('O nome do modelo não está no mesmo desenho do rótulo do fabricante')
  }
  if (parseFloat(cabecalhoFicha.estiloDoTitulo.tamanho) > 14) {
    erros.push(`Nome do modelo grande demais: ${cabecalhoFicha.estiloDoTitulo.tamanho}`)
  }
  if (!cabecalhoFicha.dentroDaFicha) {
    erros.push('O cabeçalho voltou a ser um bloco solto fora da ficha')
  }
  await p.screenshot({ path: `${SAIDA}/58-ficha-cabecalho.png` })

  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(700)

  // --- Aba "Em homologação" ---
  await p.click('[role=tab]:has-text("Em homologação")')
  await p.waitForTimeout(600)
  const previews = await p.locator('[data-em-homologacao]').count()
  const rascunhos = await p.locator('[data-em-homologacao]:has-text("Rascunho")').count()
  // O esperado vem da API, não de um número fixo: cada homologação que o
  // time finaliza tira um modelo desta aba e põe em "Homologados".
  const esperado = await p.evaluate(async () => {
    const t = localStorage.getItem('homolog.token')
    const r = await fetch('/api/vitrine', { headers: { Authorization: `Bearer ${t}` } })
    const { dispositivos } = await r.json()
    return dispositivos.filter((d) => !['APROVADO', 'PUBLICADO'].includes(d.status)).length
  })
  console.log(`11. Em homologação: ${previews} card(s) (API diz ${esperado}), ${rascunhos} com flag "Rascunho"`)
  if (previews !== esperado) {
    erros.push(`A aba mostra ${previews} em homologação, a API diz ${esperado}`)
  }
  if (rascunhos > 0) erros.push('A flag "Rascunho" voltou aos cards')
  await p.screenshot({ path: `${SAIDA}/59-em-homologacao.png` })

  // --- Resultado completo de um modelo real ---
  // De volta a Homologados: só os cards de catálogo levam à tela de informações
  await p.click('[role=tab]:has-text("Homologados")')
  await p.waitForTimeout(600)
  await p.locator('a:has-text("Exibir informações")').first().click()
  await p.waitForTimeout(1200)

  const detalhe = await p.evaluate(() => ({
    titulo: document.querySelector('[data-painel] section, [data-painel] h2')
      ? document.querySelector('[data-painel] h2')?.textContent?.trim()
      : undefined,
    itens: document.querySelectorAll('tbody tr').length,
    // A tela é a do parceiro: ele exporta, não edita o certificado
    temAbrirCertificado: !!document.querySelector('a[href*="/certificado"]'),
  }))
  const exportBloqueado = await p.locator('button:has-text("Certificado técnico")').isDisabled()

  // Fabricante e modelo numa linha só, sem repetição
  const tituloDaFicha = await p.evaluate(() => document.querySelector('h2').textContent.trim())
  console.log(`12b. Título da ficha: "${tituloDaFicha}"`)
  if (!/^\S+ \S+/.test(tituloDaFicha)) {
    erros.push(`O título deveria ser "fabricante modelo": "${tituloDaFicha}"`)
  }
  const partes = tituloDaFicha.split(/\s+/)
  if (new Set(partes.map((t) => t.toLowerCase())).size !== partes.length) {
    erros.push(`O título repete uma palavra: "${tituloDaFicha}"`)
  }
  console.log(
    `12. Resultado completo: "${detalhe.titulo}" | ${detalhe.itens} itens | exportar bloqueado: ${exportBloqueado} | link de editar: ${detalhe.temAbrirCertificado}`,
  )
  if (detalhe.itens < 40) erros.push(`Deveria listar os 48 itens, listou ${detalhe.itens}`)
  if (exportBloqueado) erros.push('Exportar certificado não deveria estar bloqueado')
  if (detalhe.temAbrirCertificado) erros.push('O link "Abrir certificado" deveria ter saído')
  await p.screenshot({ path: `${SAIDA}/60-resultado-completo.png`, fullPage: true })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-marca-detalhe.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
