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
          ) : url ? (
            <img src={`/api${url}`} alt="" className="max-h-full max-w-full object-contain" />
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

    // `homologado` é decisão manual do admin e só existe a partir da aprovação
    // (spec §11.5) — na matriz ele é leitura, muda no fluxo de aprovação.
    if (linha.chave === 'homologado') {
      const rotulo = valor === null ? '—' : valor ? 'Sim' : 'Não'
      const cor =
        valor === null
          ? 'var(--color-muted-foreground)'
          : valor
            ? 'var(--color-status-ok)'
            : 'var(--color-status-falha)'
      const fundo =
        valor === null
          ? 'transparent'
          : valor
            ? 'var(--color-status-ok-soft)'
            : 'var(--color-status-falha-soft)'
      return (
        <div
          className="px-2 py-1 text-center font-semibold"
          style={{ background: fundo, color: cor }}
          title={valor === null ? 'Definido ao aprovar a homologação' : undefined}
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
