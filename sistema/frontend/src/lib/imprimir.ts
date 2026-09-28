/**
 * Utilitário para acionar a impressão do certificado técnico em alta fidelidade.
 * O HTML do certificado já conta com regras `@page { size: A4; margin: 0; }`
 * e estilos dedicados para impressão.
 *
 * Ao carregar o HTML em um iframe e chamar `print()`, o navegador abre a caixa
 * de diálogo nativa onde o usuário pode escolher "Salvar como PDF".
 */
export function imprimirCertificadoHtml(html: string, tituloDocumento?: string): void {
  const tituloAnterior = document.title
  if (tituloDocumento) {
    document.title = tituloDocumento
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    if (tituloDocumento) {
      document.title = tituloAnterior
    }
    return
  }

  let htmlComTitulo = html
  if (tituloDocumento) {
    if (htmlComTitulo.includes('<title>')) {
      htmlComTitulo = htmlComTitulo.replace(/<title>.*?<\/title>/i, `<title>${tituloDocumento}</title>`)
    } else {
      htmlComTitulo = htmlComTitulo.replace('<head>', `<head><title>${tituloDocumento}</title>`)
    }
  }

  doc.open()
  doc.write(htmlComTitulo)
  if (tituloDocumento) {
    doc.title = tituloDocumento
  }
  doc.close()

  iframe.contentWindow?.focus()
  setTimeout(() => {
    try {
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
        if (tituloDocumento) {
          document.title = tituloAnterior
        }
      }, 3000)
    }
  }, 400)
}

/**
 * Retorna a identificação textual do dispositivo (nome comercial e modelo).
 */
export function obterIdentificadorDispositivo(
  dispositivo?: {
    nomeComercial?: string | null
    fabricante?: string | null
    modelo?: string | null
  } | null,
  fallback?: string,
): string {
  const modelo = dispositivo?.modelo?.trim() || ''
  const fabricante = dispositivo?.fabricante?.trim() || ''
  const nomeComercial = dispositivo?.nomeComercial?.trim() || ''

  const partes: string[] = []

  if (nomeComercial) {
    partes.push(nomeComercial)
    // Se o modelo não estiver contido no nome comercial, adiciona o modelo
    if (modelo && !nomeComercial.toLowerCase().includes(modelo.toLowerCase())) {
      partes.push(modelo)
    }
    // Se o fabricante não estiver no nome comercial e for conhecido, inclui no início
    if (
      fabricante &&
      !nomeComercial.toLowerCase().includes(fabricante.toLowerCase()) &&
      fabricante.toLowerCase() !== 'fabricante'
    ) {
      partes.unshift(fabricante)
    }
  } else if (fabricante || modelo) {
    if (fabricante && fabricante.toLowerCase() !== 'fabricante') partes.push(fabricante)
    if (modelo && modelo.toLowerCase() !== 'modelo') partes.push(modelo)
  }

  return partes.join(' ').trim() || fallback || 'Dispositivo'
}

/**
 * Gera o nome padronizado do arquivo PDF do certificado para download,
 * contendo o prefixo "Homologação Mobiltec" e o nome comercial do dispositivo.
 * Exemplo: "Homologação Mobiltec - Positivo L400.pdf"
 */
export function gerarNomeArquivoCertificado(
  dispositivo?: {
    nomeComercial?: string | null
    fabricante?: string | null
    modelo?: string | null
  } | null,
  fallbackId?: string,
): string {
  const identificador = obterIdentificadorDispositivo(dispositivo, fallbackId)

  // Sanitiza caracteres proibidos em nomes de arquivos: \ / : * ? " < > |
  const sanitizado = identificador
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return `Homologação Mobiltec - ${sanitizado || 'Certificado'}.pdf`
}
