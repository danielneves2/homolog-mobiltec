/**
 * Mapeamento e resolução de datasheets disponíveis para dispositivos homologados.
 */

export interface DatasheetInfo {
  arquivo: string
  url: string
  nomeDownload: string
}

interface ItemCatalogoDatasheet {
  arquivo: string
  fabricante: string
  modelos: string[]
  palavrasChave: string[]
}

const CATALOGO_DATASHEETS: ItemCatalogoDatasheet[] = [
  {
    arquivo: 'ARNY_AR_SP5.pdf',
    fabricante: 'ARNY',
    modelos: ['AR_SP5', 'SP5', 'AR SP5'],
    palavrasChave: ['arny', 'sp5'],
  },
  {
    arquivo: 'GERTEC_GPOS700-Mini.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS700-Mini', 'GPOS 700 Mini', 'GPOS700 Mini', 'GPOS 700-Mini'],
    palavrasChave: ['gpos700-mini', 'gpos 700 mini', 'gpos700mini'],
  },
  {
    arquivo: 'GERTEC_GPOS700.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS700', 'GPOS 700'],
    palavrasChave: ['gpos700', 'gpos 700'],
  },
  {
    arquivo: 'GERTEC_GPOS700X.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS700X', 'GPOS 700X', 'GPOS 700 X'],
    palavrasChave: ['gpos700x', 'gpos 700x'],
  },
  {
    arquivo: 'GERTEC_GPOS720.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS720', 'GPOS 720'],
    palavrasChave: ['gpos720', 'gpos 720'],
  },
  {
    arquivo: 'GERTEC_GPOS760.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS760', 'GPOS 760'],
    palavrasChave: ['gpos760', 'gpos 760'],
  },
  {
    arquivo: 'GERTEC_GPOS780.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS780', 'GPOS 780'],
    palavrasChave: ['gpos780', 'gpos 780'],
  },
  {
    arquivo: 'GERTEC_GPOS790.pdf',
    fabricante: 'GERTEC',
    modelos: ['GPOS790', 'GPOS 790'],
    palavrasChave: ['gpos790', 'gpos 790'],
  },
  {
    arquivo: 'INGENICO_EX4000.pdf',
    fabricante: 'INGENICO',
    modelos: ['EX4000', 'EX 4000'],
    palavrasChave: ['ex4000', 'ex 4000'],
  },
  {
    arquivo: 'MOREFUN_MF960.pdf',
    fabricante: 'MOREFUN',
    modelos: ['MF960', 'MF 960'],
    palavrasChave: ['mf960', 'morefun'],
  },
  {
    arquivo: 'NEWLAND_N910.pdf',
    fabricante: 'NEWLAND',
    modelos: ['N910', 'N910 Pro', 'N910PRO', 'N910 PLUS'],
    palavrasChave: ['n910'],
  },
  {
    arquivo: 'PAX_A910.pdf',
    fabricante: 'PAX',
    modelos: ['A910', 'A 910'],
    palavrasChave: ['a910'],
  },
  {
    arquivo: 'PAX_A960.pdf',
    fabricante: 'PAX',
    modelos: ['A960', 'A 960'],
    palavrasChave: ['a960'],
  },
  {
    arquivo: 'POSITIVO_L300.pdf',
    fabricante: 'POSITIVO',
    modelos: ['L300', 'L3', 'L 300'],
    palavrasChave: ['l300', 'positivo l3'],
  },
  {
    arquivo: 'POSITIVO_L400.pdf',
    fabricante: 'POSITIVO',
    modelos: ['L400', 'L 400'],
    palavrasChave: ['l400'],
  },
  {
    arquivo: 'SUNIMI_V2.pdf',
    fabricante: 'SUNMI',
    modelos: ['V2', 'V2 Pro', 'V2PRO', 'V2s'],
    palavrasChave: ['sunmi v2', 'sunimi v2', 'v2'],
  },
  {
    arquivo: 'SUNMI_P2MINI.pdf',
    fabricante: 'SUNMI',
    modelos: ['P2MINI', 'P2mini', 'P2mini-B-8766', 'P2 Mini'],
    palavrasChave: ['p2mini', 'p2 mini'],
  },
  {
    arquivo: 'SUNMI_P2LITE.pdf',
    fabricante: 'SUNMI',
    modelos: ['P2LITE', 'P2_LITE_SE-B', 'P2 Lite', 'P2_LITE'],
    palavrasChave: ['p2lite', 'p2_lite', 'p2 lite'],
  },
  {
    arquivo: 'SUNMI_P2_TECTOY.pdf',
    fabricante: 'SUNMI',
    modelos: ['P2 Tectoy', 'P2_TECTOY', 'TECTOY P2'],
    palavrasChave: ['p2 tectoy', 'p2_tectoy'],
  },
  {
    arquivo: 'SUNMI_P2.pdf',
    fabricante: 'SUNMI',
    modelos: ['P2', 'P2-A11', 'P2 A11'],
    palavrasChave: ['sunmi p2', 'p2-a11'],
  },
  {
    arquivo: 'SUNYARD_S200.pdf',
    fabricante: 'SUNYARD',
    modelos: ['S200', 'S 200'],
    palavrasChave: ['s200'],
  },
  {
    arquivo: 'SUNYARD_S60.pdf',
    fabricante: 'SUNYARD',
    modelos: ['S60', 'S 60'],
    palavrasChave: ['s60'],
  },
  {
    arquivo: 'SUNYARD_S60PRO.pdf',
    fabricante: 'SUNYARD',
    modelos: ['S60PRO', 'S60 Pro', 'S 60 PRO'],
    palavrasChave: ['s60pro', 's60 pro'],
  },
  {
    arquivo: 'VERIFONE_X990PRO.pdf',
    fabricante: 'VERIFONE',
    modelos: ['X990 Pro', 'X990PRO', 'X990', 'X990 Plus'],
    palavrasChave: ['x990'],
  },
]

/**
 * Retorna o datasheet associado ao dispositivo, ou null caso ainda não cadastrado.
 */
export function obterDatasheetDispositivo(dispositivo?: {
  fabricante?: string | null
  modelo?: string | null
  nomeComercial?: string | null
  datasheetUrl?: string | null
} | null): DatasheetInfo | null {
  if (!dispositivo) return null

  const nomeFinal = (dispositivo.nomeComercial || `${dispositivo.fabricante ?? ''} ${dispositivo.modelo ?? ''}`).trim()

  // 0. Se já tem datasheetUrl anexado pelo Admin (upload no banco/storage)
  if (dispositivo.datasheetUrl && dispositivo.datasheetUrl.trim()) {
    const url = dispositivo.datasheetUrl.trim()
    const urlFormatada =
      url.startsWith('/uploads/')
        ? `/api${url}`
        : url

    return {
      arquivo: 'datasheet.pdf',
      url: urlFormatada,
      nomeDownload: `Datasheet - ${nomeFinal}.pdf`,
    }
  }

  const fab = (dispositivo.fabricante || '').trim().toLowerCase()
  const mod = (dispositivo.modelo || '').trim().toLowerCase()
  const nome = (dispositivo.nomeComercial || '').trim().toLowerCase()
  const combinacao = `${fab} ${mod} ${nome}`.toLowerCase()

  // 1. Tenta match específico por fabricante e modelo
  for (const item of CATALOGO_DATASHEETS) {
    const matchFab =
      !fab ||
      item.fabricante.toLowerCase().includes(fab) ||
      fab.includes(item.fabricante.toLowerCase())

    if (matchFab) {
      for (const m of item.modelos) {
        const mLower = m.toLowerCase()
        if (mod === mLower || mod.includes(mLower) || nome.includes(mLower)) {
          const nomeFinal = (dispositivo.nomeComercial || `${dispositivo.fabricante} ${dispositivo.modelo}`).trim()
          return {
            arquivo: item.arquivo,
            url: `/datasheets/${item.arquivo}`,
            nomeDownload: `Datasheet - ${nomeFinal}.pdf`,
          }
        }
      }
    }
  }

  // 2. Tenta por palavras-chave mais específicas
  for (const item of CATALOGO_DATASHEETS) {
    for (const kw of item.palavrasChave) {
      if (combinacao.includes(kw)) {
        const nomeFinal = (dispositivo.nomeComercial || `${dispositivo.fabricante} ${dispositivo.modelo}`).trim()
        return {
          arquivo: item.arquivo,
          url: `/datasheets/${item.arquivo}`,
          nomeDownload: `Datasheet - ${nomeFinal}.pdf`,
        }
      }
    }
  }

  return null
}
