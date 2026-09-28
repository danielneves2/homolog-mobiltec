/**
 * Utilitário para acionar a impressão do certificado técnico em alta fidelidade.
 * O HTML do certificado já conta com regras `@page { size: A4; margin: 0; }`
 * e estilos dedicados para impressão.
 *
 * Ao carregar o HTML em um iframe e chamar `print()`, o navegador abre a caixa
 * de diálogo nativa onde o usuário pode escolher "Salvar como PDF".
 */
export function imprimirCertificadoHtml(html: string): void {
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
  if (!doc) return

  doc.open()
  doc.write(html)
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
      }, 3000)
    }
  }, 400)
}

/**
 * Gera o nome padronizado do arquivo PDF do certificado para download,
 * contendo o nome e o modelo do dispositivo para salvar pré-pronto.
 */
export function gerarNomeArquivoCertificado(
  dispositivo?: {
    nomeComercial?: string | null
    fabricante?: string | null
    modelo?: string | null
  } | null,
  fallbackId?: string,
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
    // Se o fabricante não estiver no nome comercial e não for genérico, inclui no início
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

  const base = partes.join(' ').trim() || fallbackId || 'homologacao'

  const limpo = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return `certificado-${limpo || fallbackId || 'homologacao'}.pdf`
}
