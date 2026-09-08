/**
 * Descobre onde está o aparelho dentro da foto e devolve o zoom que o faz
 * ocupar a caixa inteira.
 *
 * Por que isso existe: as fotos chegam com margem branca embutida no
 * arquivo, e cada uma com uma sobra diferente — medido no catálogo, o
 * conteúdo útil vai de 91% da largura (Positivo L400) a 60% (SUNMI). Com
 * `object-contain`, quem manda é a moldura do arquivo, então o mesmo card
 * mostrava um aparelho grande e outro pequeno sem nenhum motivo visual.
 *
 * O corte certo seria no upload, recortando o arquivo uma vez. Isso exige
 * biblioteca de imagem no servidor (`sharp` e afins) — dependência nativa
 * que ninguém pediu. Aqui a medição é feita no navegador, numa cópia de
 * 64×64: são 4 mil pixels por foto, uma vez por sessão.
 */

/** Caixa do conteúdo, em frações da imagem natural. */
export interface Recorte {
  x: number
  y: number
  largura: number
  altura: number
}

const cache = new Map<string, Recorte | null>()

/** Lado da miniatura usada para achar o conteúdo. Precisão de ~1,5%. */
const AMOSTRA = 64
/** Acima disso o pixel conta como fundo claro. */
const LIMIAR_CLARO = 244
/** Abaixo disso o pixel conta como transparente. */
const LIMIAR_ALFA = 24

/**
 * Onde está o conteúdo da imagem, ignorando fundo branco e transparente.
 * `null` quando não dá para saber (canvas bloqueado, imagem vazia).
 */
export function medirRecorte(img: HTMLImageElement): Recorte | null {
  const chave = img.currentSrc || img.src
  const guardado = cache.get(chave)
  if (guardado !== undefined) return guardado

  let recorte: Recorte | null = null
  try {
    const c = document.createElement('canvas')
    c.width = AMOSTRA
    c.height = AMOSTRA
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, AMOSTRA, AMOSTRA)
    const d = ctx.getImageData(0, 0, AMOSTRA, AMOSTRA).data

    let x0 = AMOSTRA
    let y0 = AMOSTRA
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < AMOSTRA; y++) {
      for (let x = 0; x < AMOSTRA; x++) {
        const i = (y * AMOSTRA + x) * 4
        const claro =
          d[i] > LIMIAR_CLARO && d[i + 1] > LIMIAR_CLARO && d[i + 2] > LIMIAR_CLARO
        if (d[i + 3] <= LIMIAR_ALFA || claro) continue
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }

    if (x1 >= 0) {
      // Uma célula de folga de cada lado: a miniatura arredonda a borda do
      // aparelho, e cortar rente comeria um fio do contorno.
      x0 = Math.max(0, x0 - 1)
      y0 = Math.max(0, y0 - 1)
      x1 = Math.min(AMOSTRA - 1, x1 + 1)
      y1 = Math.min(AMOSTRA - 1, y1 + 1)
      recorte = {
        x: x0 / AMOSTRA,
        y: y0 / AMOSTRA,
        largura: (x1 - x0 + 1) / AMOSTRA,
        altura: (y1 - y0 + 1) / AMOSTRA,
      }
    }
  } catch {
    // Canvas contaminado por outra origem: segue com a foto como está.
    recorte = null
  }

  cache.set(chave, recorte)
  return recorte
}

/** Zoom máximo. Uma foto quase vazia não vira um borrão gigante. */
const ZOOM_MAXIMO = 2.6
/** Abaixo disso não compensa mexer — a foto já usa a caixa. */
const ZOOM_MINIMO = 1.03

/**
 * `transform` que leva o conteúdo da foto a preencher a caixa.
 *
 * `object-contain` encaixa a imagem **inteira** na caixa; o que se quer é
 * encaixar só a parte com aparelho. A conta é a razão entre as duas escalas,
 * mais a translação que recentraliza o conteúdo (o recorte raramente está
 * no meio do arquivo).
 */
export function transformDoRecorte(
  img: HTMLImageElement,
  recorte: Recorte,
): string | undefined {
  const estilo = getComputedStyle(img)
  const caixaLargura =
    img.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
  const caixaAltura =
    img.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom)
  const { naturalWidth: W, naturalHeight: H } = img
  if (caixaLargura <= 0 || caixaAltura <= 0 || !W || !H) return undefined

  const escalaAtual = Math.min(caixaLargura / W, caixaAltura / H)
  const escalaDesejada = Math.min(
    caixaLargura / (recorte.largura * W),
    caixaAltura / (recorte.altura * H),
  )
  const zoom = Math.min(ZOOM_MAXIMO, escalaDesejada / escalaAtual)
  if (zoom < ZOOM_MINIMO) return undefined

  // Distância do centro do conteúdo até o centro da imagem, já em pixels
  const dx = (recorte.x + recorte.largura / 2 - 0.5) * W * escalaAtual
  const dy = (recorte.y + recorte.altura / 2 - 0.5) * H * escalaAtual

  return `translate(${(-zoom * dx).toFixed(2)}px, ${(-zoom * dy).toFixed(2)}px) scale(${zoom.toFixed(3)})`
}
