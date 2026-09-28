import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Converte o HTML das páginas do certificado em um arquivo PDF real
 * e realiza o download direto e automático no navegador, sem diálogo de impressão.
 */
export async function baixarPdfDireto(html: string, nomeArquivo: string): Promise<void> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.style.width = '794px' // ~210mm a 96 DPI
  container.style.height = '1123px' // ~297mm a 96 DPI
  container.style.zIndex = '-9999'
  container.style.opacity = '1'
  container.style.pointerEvents = 'none'

  const iframe = document.createElement('iframe')
  iframe.style.width = '794px'
  iframe.style.height = '1123px'
  iframe.style.border = 'none'
  container.appendChild(iframe)
  document.body.appendChild(container)

  try {
    const doc = iframe.contentWindow?.document
    if (!doc) throw new Error('Não foi possível inicializar renderizador de PDF.')

    doc.open()
    doc.write(html)
    doc.close()

    // Aguarda o parsing do DOM e renderização
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Aguarda imagens carregarem
    if (doc.images.length > 0) {
      await Promise.all(
        Array.from(doc.images).map(
          (img) =>
            new Promise((res) => {
              if (img.complete) return res(null)
              img.onload = () => res(null)
              img.onerror = () => res(null)
            }),
        ),
      )
    }

    const paginas = Array.from(doc.querySelectorAll<HTMLElement>('.pagina'))
    if (paginas.length === 0) {
      throw new Error('Nenhuma página encontrada para gerar o PDF.')
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    for (let i = 0; i < paginas.length; i++) {
      const pagina = paginas[i]
      if (i > 0) {
        pdf.addPage('a4', 'portrait')
      }

      const canvas = await html2canvas(pagina, {
        scale: 2, // 2x para nitidez nítida de impressão
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
    }

    pdf.save(nomeArquivo)
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}
