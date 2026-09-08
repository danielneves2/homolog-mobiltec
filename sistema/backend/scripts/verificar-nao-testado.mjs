/**
 * A célula "Não testado" da planilha.
 *
 * Antes era branca com um traço, e branco na matriz não se distinguia de linha
 * vazia. Agora tem de aparecer escrita e num cinza MAIS ESCURO que o de "Não
 * aplicável" — pendente pesa mais que inexistente.
 *
 * Mede no pixel, não no estilo: `background` computado diz o que a folha pediu,
 * não o que foi pintado.
 */
import { chromium } from 'playwright'

const SAIDA = 'C:/Users/MOBILTEC/Desktop/Homolog Mobiltec/sistema/.verificacao'
const erros = []

/** Luminância relativa (WCAG) a partir de "rgb(r, g, b)" ou [r,g,b] */
const lum = (c) => {
  const [r, g, b] = Array.isArray(c) ? c : c.match(/\d+/g).slice(0, 3).map(Number)
  return [r, g, b]
    .map((v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
}
const contraste = (a, b) => {
  const [x, y] = [lum(a), lum(b)]
  return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(1)
}

const nav = await chromium.launch()
const p = await nav.newPage({ viewport: { width: 1600, height: 950 } })
p.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

try {
  await p.goto('http://localhost:8080/login', { waitUntil: 'networkidle' })
  await p.fill('#email', 'admin@mobiltec.com.br')
  await p.fill('#senha', 'admin123')
  await p.click('button[type=submit]')
  await p.waitForURL('http://localhost:8080/')
  await p.goto('http://localhost:8080/matriz/pos', { waitUntil: 'networkidle' })
  await p.waitForSelector('[data-status]')
  await p.waitForTimeout(700)

  // --- 1. O rótulo está escrito, e o traço saiu ---
  const rotulos = await p.evaluate(() => {
    const de = (s) =>
      [...document.querySelectorAll(`[data-status="${s}"]`)].map((b) => b.textContent.trim())
    return {
      naoTestado: [...new Set(de('NAO_TESTADO'))],
      quantos: de('NAO_TESTADO').length,
      comTraco: de('NAO_TESTADO').filter((t) => t.includes('—')).length,
    }
  })
  console.log(
    `1. "Não testado": ${rotulos.quantos} célula(s) | textos: ${JSON.stringify(rotulos.naoTestado)}`,
  )
  if (rotulos.quantos === 0) erros.push('Nenhuma célula "Não testado" na planilha de PoS')
  if (rotulos.comTraco > 0) erros.push(`${rotulos.comTraco} célula(s) ainda com o traço "—"`)
  if (rotulos.naoTestado.some((t) => t !== 'Não testado')) {
    erros.push(`Rótulo inesperado na célula: ${JSON.stringify(rotulos.naoTestado)}`)
  }

  // --- 2. Estilos declarados: mais escuro que "Não aplicável" ---
  const cores = await p.evaluate(() => {
    const primeira = (s) => document.querySelector(`[data-status="${s}"]`)
    const ler = (el) =>
      el ? { fundo: getComputedStyle(el).backgroundColor, texto: getComputedStyle(el).color } : null
    return {
      naoTestado: ler(primeira('NAO_TESTADO')),
      naoAplicavel: ler(primeira('NAO_APLICAVEL')),
      ok: ler(primeira('OK')),
    }
  })
  console.log(`2. Cores declaradas: ${JSON.stringify(cores)}`)

  if (!cores.naoAplicavel) {
    erros.push('Nenhuma célula "Não aplicável" à vista para comparar')
  } else {
    const lNT = lum(cores.naoTestado.fundo)
    const lNA = lum(cores.naoAplicavel.fundo)
    console.log(`2b. Luminância — não testado ${lNT.toFixed(3)} | não aplicável ${lNA.toFixed(3)}`)
    if (lNT >= lNA) {
      erros.push(
        `"Não testado" (${cores.naoTestado.fundo}) não é mais escuro que "Não aplicável" (${cores.naoAplicavel.fundo})`,
      )
    }
  }

  // O branco de antes tornava a célula indistinguível de linha vazia
  if (cores.naoTestado?.fundo === 'rgb(255, 255, 255)') {
    erros.push('A célula "Não testado" continua branca')
  }

  const c = contraste(cores.naoTestado.fundo, cores.naoTestado.texto)
  console.log(`3. Contraste do rótulo sobre o fundo: ${c}:1`)
  if (c < 4.5) erros.push(`Rótulo "Não testado" com contraste de só ${c}:1`)

  // --- 4. E o que foi realmente pintado na tela ---
  //
  // Só serve célula inteiramente dentro da janela: fora dela `getImageData`
  // devolve zeros, e um preto inventado passaria por qualquer teste de "não
  // está branco".
  // A primeira célula pendente costuma estar abaixo da dobra — traz uma para o
  // meio da janela antes de fotografar.
  await p.evaluate(() =>
    document
      .querySelector('[data-status="NAO_TESTADO"]')
      ?.scrollIntoView({ block: 'center', inline: 'center' }),
  )
  await p.waitForTimeout(500)

  const alvo = await p.evaluate(() => {
    const dentro = [...document.querySelectorAll('[data-status="NAO_TESTADO"]')].find((el) => {
      const r = el.getBoundingClientRect()
      return r.top > 0 && r.left > 0 && r.bottom < innerHeight && r.right < innerWidth && r.width > 20
    })
    if (!dentro) return null
    const r = dentro.getBoundingClientRect()
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
      declarado: getComputedStyle(dentro).backgroundColor.match(/\d+/g).slice(0, 3).map(Number),
    }
  })
  if (!alvo) erros.push('Nenhuma célula "Não testado" visível na janela para amostrar o pixel')

  const png = await p.screenshot()
  await p.evaluate(
    (b64) =>
      new Promise((ok) => {
        const img = new Image()
        img.onload = () => {
          const cv = document.createElement('canvas')
          cv.width = img.width
          cv.height = img.height
          cv.getContext('2d').drawImage(img, 0, 0)
          window.__ctx = cv.getContext('2d')
          window.__esc = img.width / window.innerWidth
          ok()
        }
        img.src = 'data:image/png;base64,' + b64
      }),
    png.toString('base64'),
  )

  const pintado = alvo && await p.evaluate((a) => {
    const e = window.__esc
    // Uma faixa a 3px da borda superior da célula: acima do texto, ali só
    // existe o preenchimento.
    const d = window.__ctx.getImageData(
      Math.round(a.x + 4) * e,
      Math.round(a.y + 3) * e,
      Math.round(a.w - 8) * e,
      1,
    ).data
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      g += d[i + 1]
      b += d[i + 2]
      n++
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
  }, alvo)
  if (pintado) {
    console.log(
      `4. Pixel médio: rgb(${pintado.join(', ')}) | declarado rgb(${alvo.declarado.join(', ')})`,
    )
    // Bate com o que a folha pediu: prova que o cinza chegou à tela, e não só
    // ao estilo computado
    const desvio = Math.max(...pintado.map((v, i) => Math.abs(v - alvo.declarado[i])))
    if (desvio > 6) {
      erros.push(
        `O pixel pintado (rgb(${pintado.join(', ')})) não bate com o declarado (rgb(${alvo.declarado.join(', ')})): ${desvio} de desvio`,
      )
    }
    if (pintado.every((v) => v > 240)) {
      erros.push(`O preenchimento pintado continua quase branco: rgb(${pintado.join(', ')})`)
    }
  }

  await p.screenshot({ path: `${SAIDA}/90-nao-testado.png` })
} catch (e) {
  erros.push(`EXCECAO: ${e.message}`)
  await p.screenshot({ path: `${SAIDA}/erro-nao-testado.png` }).catch(() => {})
} finally {
  await nav.close()
}

console.log('\n' + '='.repeat(50))
console.log(erros.length === 0 ? 'TUDO OK' : `${erros.length} PROBLEMA(S):\n  - ${erros.join('\n  - ')}`)
process.exit(erros.length ? 1 : 0)
