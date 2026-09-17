import type { AnexoObservacao } from '@/lib/tipos'

export interface ObservacaoItemDados {
  texto: string
  anexos: AnexoObservacao[]
}

/**
 * Formata o tamanho de arquivos em bytes para formato legível (KB, MB).
 */
export function formatarTamanhoArquivo(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Identifica notas geradas pela importação automática da planilha legada.
 */
export function ehNotaDaImportacao(texto?: string | null): boolean {
  if (!texto) return false
  return /planilha de origem|planilha:|na planilha|Planilha:/i.test(texto)
}

/**
 * Faz o parse da observação de um item de resultado (célula da matriz ou ficha).
 * Suporta:
 * 1. Formato novo estruturado JSON: { texto: "...", anexos: [...] }
 * 2. Formato legado com markdown embutido: [Print anexado: nome](url) ou [Arquivo log/zip: nome](url)
 * 3. Texto puro digitado pelo usuário
 */
export function parseObservacaoItem(raw?: string | null): ObservacaoItemDados {
  if (!raw || !raw.trim()) {
    return { texto: '', anexos: [] }
  }
  const trimmed = raw.trim()

  // 1. Tentar JSON estruturado { texto, anexos }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null && ('texto' in parsed || 'anexos' in parsed)) {
        return {
          texto: typeof parsed.texto === 'string' ? parsed.texto : '',
          anexos: Array.isArray(parsed.anexos) ? parsed.anexos : [],
        }
      }
    } catch {
      // continua para fallback de regex/legado
    }
  }

  // 2. Extrair tags legadas do texto: [Print anexado: NOME](URL) ou [Arquivo log/zip: NOME](URL)
  const regexAnexo = /\[(Print anexado|Arquivo log\/zip):\s*([^\]]+)\]\(([^)]+)\)/gi
  const anexos: AnexoObservacao[] = []
  let match: RegExpExecArray | null

  while ((match = regexAnexo.exec(trimmed)) !== null) {
    const rotulo = match[1].toLowerCase()
    const tipo = rotulo.includes('print') ? 'imagem' : 'zip'
    const nome = match[2].trim()
    const url = match[3].trim()
    anexos.push({
      id: `anexo-${anexos.length + 1}`,
      nome,
      url,
      tipo,
    })
  }

  const textoLimpo = trimmed.replace(regexAnexo, '').trim()

  return { texto: textoLimpo, anexos }
}

/**
 * Serializa a observação para salvar no banco relacional.
 * Se não houver anexos, salva como texto puro (compatibilidade e clareza).
 * Se houver anexos, salva em formato JSON { texto, anexos }.
 */
export function serializarObservacaoItem(texto: string, anexos: AnexoObservacao[]): string {
  const textoLimpo = texto.trim()
  if (!anexos || anexos.length === 0) {
    return textoLimpo
  }
  return JSON.stringify({
    texto: textoLimpo,
    anexos,
  })
}
