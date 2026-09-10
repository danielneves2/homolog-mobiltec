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
