import { useEffect, useRef, useState } from 'react'
import { ROTULO_GERENCIAMENTO } from '@/lib/tipos'
import type { ColunaMatriz, LINHAS_FICHA, TipoGerenciamento } from '@/lib/tipos'

type Linha = (typeof LINHAS_FICHA)[number]

interface Props {
  coluna: ColunaMatriz
  linha: Linha
  somenteLeitura: boolean
  enviandoFoto: boolean
  aoSalvarFicha: (campos: Record<string, unknown>) => void
  aoSalvarDispositivo: (campos: Record<string, unknown>) => void
  aoEnviarFoto: (arquivo: File) => void
}

/**
 * Célula das linhas de cabeçalho (S/N, IMEI, versão do agente…).
 *
 * Edita no lugar, como numa planilha: clica, digita, sai do campo e salva.
 * Alguns campos são do dispositivo (fabricante/modelo) e outros da homologação —
 * daí os dois callbacks.
 */
export function CelulaFicha({
  coluna,
  linha,
  somenteLeitura,
  enviandoFoto,
  aoSalvarFicha,
  aoSalvarDispositivo,
  aoEnviarFoto,
}: Props) {
  const { homologacao } = coluna
  const { dispositivo } = homologacao

  const valorBruto =
    linha.edicao === 'dispositivo' || linha.edicao === 'foto'
      ? ((dispositivo as unknown as Record<string, unknown>)[linha.chave] as string | null)
      : ((homologacao as unknown as Record<string, unknown>)[linha.chave] as
          | string
          | boolean
          | null)

  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const refArquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editando) setRascunho(typeof valorBruto === 'string' ? valorBruto : '')
  }, [valorBruto, editando])

  function salvarTexto() {
    setEditando(false)
    const novo = rascunho.trim()
    const antigo = typeof valorBruto === 'string' ? valorBruto : ''
    if (novo === antigo) return
    const campos = { [linha.chave]: novo || null }
    if (linha.edicao === 'dispositivo') aoSalvarDispositivo(campos)
    else aoSalvarFicha(campos)
  }

  // --- Foto do dispositivo: entra no certificado (spec §8.1) ---
  if (linha.edicao === 'foto') {
    const url = valorBruto as string | null
    const srcImg = url ? (url.startsWith('http://') || url.startsWith('https://') ? url : `/api${url}`) : null
    return (
      <div className="p-1">
        <input
          ref={refArquivo}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            if (arquivo) aoEnviarFoto(arquivo)
            e.target.value = '' // permite reenviar o mesmo arquivo
          }}
        />
        <button
          type="button"
          disabled={enviandoFoto}
          onClick={() => refArquivo.current?.click()}
          title={url ? 'Trocar a foto' : 'Enviar foto (PNG, JPEG ou WebP, até 8 MB)'}
          className="w-full h-16 rounded border border-dashed flex items-center justify-center overflow-hidden transition-colors disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {enviandoFoto ? (
            <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
              enviando…
            </span>
          ) : srcImg ? (
            <img
              src={srcImg}
              alt={homologacao.dispositivo.nomeComercial || ''}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain transition-opacity duration-300"
              crossOrigin="anonymous"
            />
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
              + foto
            </span>
          )}
        </button>
      </div>
    )
  }

  // --- Booleanos: Homologado e Precisa Assinatura DEV ---
  if (linha.edicao === 'booleano') {
    const valor = valorBruto as boolean | null

    // `homologado` na planilha reflete o status atual do ciclo de vida:
    // "Em Validação", "Em Revisão", "Homologado", "Não Homologado", "Rascunho"
    if (linha.chave === 'homologado') {
      const status = homologacao.status
      let rotulo = 'Rascunho'
      let cor = 'var(--color-muted-foreground)'
      let fundo = 'transparent'

      if (status === 'APROVADO' || status === 'PUBLICADO') {
        rotulo = 'Homologado'
        cor = 'var(--color-status-ok)'
        fundo = 'var(--color-status-ok-soft)'
      } else if (status === 'AGUARDANDO_ANALISE') {
        rotulo = 'Em Validação'
        cor = 'var(--color-info-fg)'
        fundo = 'var(--color-info-soft)'
      } else if (status === 'EM_REVISAO') {
        rotulo = 'Em Revisão'
        cor = 'var(--color-brand-orange)'
        fundo = 'var(--color-brand-orange-soft)'
      } else if (status === 'REPROVADO' || valor === false) {
        rotulo = 'Não Homologado'
        cor = 'var(--color-status-falha)'
        fundo = 'var(--color-status-falha-soft)'
      }

      return (
        <div
          className="px-2 py-1 text-center font-semibold text-xs whitespace-nowrap rounded-sm mx-1"
          style={{ background: fundo, color: cor }}
          title={`Status atual: ${rotulo}`}
        >
          {rotulo}
        </div>
      )
    }

    return (
      <button
        type="button"
        disabled={somenteLeitura}
        onClick={() => aoSalvarFicha({ [linha.chave]: !valor })}
        className="w-full px-2 py-1 text-center disabled:cursor-default"
      >
        {valor ? 'Sim' : 'Não'}
      </button>
    )
  }

  // --- Gerenciamento: lista fechada ---
  if (linha.edicao === 'gerenciamento') {
    const valor = valorBruto as TipoGerenciamento
    if (somenteLeitura) {
      return <div className="px-2 py-1 text-center">{ROTULO_GERENCIAMENTO[valor]}</div>
    }
    return (
      <select
        value={valor}
        onChange={(e) => aoSalvarFicha({ gerenciamento: e.target.value })}
        className="w-full px-1 py-1 bg-transparent text-center text-xs"
      >
        {(Object.keys(ROTULO_GERENCIAMENTO) as TipoGerenciamento[]).map((g) => (
          <option key={g} value={g}>
            {ROTULO_GERENCIAMENTO[g]}
          </option>
        ))}
      </select>
    )
  }

  // --- Texto ---
  if (editando && !somenteLeitura) {
    return (
      <input
        autoFocus
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={salvarTexto}
        onKeyDown={(e) => {
          if (e.key === 'Enter') salvarTexto()
          if (e.key === 'Escape') {
            setRascunho(typeof valorBruto === 'string' ? valorBruto : '')
            setEditando(false)
          }
        }}
        className="w-full px-2 py-1 text-center text-xs border-0 outline-2"
        style={{ background: 'var(--color-muted)', outlineColor: 'var(--color-primary)' }}
      />
    )
  }

  const texto = typeof valorBruto === 'string' && valorBruto ? valorBruto : '—'

  return (
    <button
      type="button"
      disabled={somenteLeitura}
      onClick={() => setEditando(true)}
      title={somenteLeitura ? 'Homologação aprovada — somente leitura' : texto}
      className="w-full px-2 py-1 text-center truncate disabled:cursor-default hover:bg-[var(--color-muted)] transition-colors"
      style={{ color: texto === '—' ? 'var(--color-muted-foreground)' : undefined }}
    >
      {texto}
    </button>
  )
}
